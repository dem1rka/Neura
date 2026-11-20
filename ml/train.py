"""Nested site-held-out evaluation on verified public ABIDE questionnaire data."""
import csv
import hashlib
import json
import math
import platform
import urllib.request
from collections import Counter
from pathlib import Path

import joblib
import numpy as np
import sklearn
from sklearn.base import clone
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, average_precision_score, balanced_accuracy_score,
                             brier_score_loss, confusion_matrix, roc_auc_score)
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from synthetic import generate
from family import run as train_family

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / "cache"
OUT = ROOT / "results"
FIELDS = ["srs_" + name + "_raw" for name in
          ("awareness", "cognition", "communication", "motivation", "mannerisms")]
SEED = 718
MANIFEST = json.loads((ROOT / "sources.json").read_text())


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read_source(entry):
    path = CACHE / entry["file"]
    if not path.exists():
        with urllib.request.urlopen(entry["url"], timeout=90) as response:
            data = response.read()
        if digest(data) != entry["sha256"]:
            raise ValueError("Unexpected download: " + path.name)
        path.write_bytes(data)
    data = path.read_bytes()
    if digest(data) != entry["sha256"]:
        raise ValueError("Source checksum mismatch: " + path.name)
    delim = "\t" if path.suffix == ".tsv" else ","
    return [{k.strip().lower(): v for k, v in row.items() if k}
            for row in csv.DictReader(data.decode("latin1").splitlines(), delimiter=delim)]


def number(row, key):
    try:
        return float(row[key])
    except (KeyError, TypeError, ValueError):
        return math.nan


def cohort():
    records, external, audit, seen = [], [], {}, set()
    for entry in MANIFEST:
        rows = read_source(entry)
        counts = Counter()
        for row in rows:
            if entry["file"] == "ABIDEII-TCD_1.tsv":
                counts["srs_used_in_control_selection"] += 1
                continue
            age = number(row, "age_at_scan")
            dx = number(row, "dx_group")
            if not (3 <= age < 12 and dx in (1, 2)):
                counts["outside_age_or_label"] += 1
                continue
            if entry["file"] == "abide.csv":
                score = number(row, "srs_raw_total")
                if row["site_id"] == "YALE" and number(row, "srs_version") == 1 and 0 <= score <= 195:
                    external.append((score, int(dx == 1)))
                    counts["included"] += 1
                else:
                    counts["outside_external_protocol"] += 1
                continue
            values = [number(row, f) for f in FIELDS]
            if (number(row, "srs_version") != 1 or number(row, "srs_edition") not in (1, 2)
                    or number(row, "srs_informant") not in (1, 2, 3, 8)
                    or not all(v.is_integer() and 0 <= v <= 195 for v in values)
                    or not 0 <= sum(values) <= 195 or sum(values) != number(row, "srs_total_raw")):
                counts["incomplete_or_incompatible_srs"] += 1
                continue
            participant = row["participant_id"]
            if not participant or participant in seen:
                raise ValueError("Missing or duplicate ABIDE II participant")
            seen.add(participant)
            site = row["site_id"]
            assert entry["file"] == site + ".tsv"
            records.append((participant, site, age, int(dx == 1), *values))
            counts["included"] += 1
        audit[entry["file"]] = dict(total_rows=len(rows), **counts)
    return records, external, audit


def logistic(c):
    return make_pipeline(StandardScaler(), LogisticRegression(C=c, max_iter=1000))


MODELS = {"logistic_C0.1": logistic(.1), "logistic_C1": logistic(1),
          "logistic_C10": logistic(10), "boost_depth1": GradientBoostingClassifier(
              n_estimators=60, max_depth=1, learning_rate=.05, random_state=SEED),
          "boost_depth2": GradientBoostingClassifier(n_estimators=60, max_depth=2,
                                                      learning_rate=.05, random_state=SEED)}


def fit_predict(model, x, y, test):
    return clone(model).fit(x, y).predict_proba(test)[:, 1]


def train_choice(x, y, groups):
    sites = np.unique(groups)
    candidates = []
    for name, model in MODELS.items():
        scores = np.zeros(len(y))
        for site in sites:
            mask = groups == site
            scores[mask] = fit_predict(model, x[~mask], y[~mask], x[mask])
        macro_auc = np.mean([roc_auc_score(y[groups == s], scores[groups == s]) for s in sites])
        candidates.append((float(macro_auc), name, scores))
    auc, name, scores = max(candidates, key=lambda item: item[0])
    def utility(t):
        return np.mean([balanced_accuracy_score(y[groups == s], scores[groups == s] >= t)
                        for s in sites])
    threshold = max(np.linspace(.1, .9, 33), key=lambda t: (utility(t), -abs(t-.5)))
    return name, float(threshold), {n: a for a, n, _ in candidates}


def metrics(y, scores, decisions):
    tn, fp, fn, tp = map(int, confusion_matrix(y, decisions, labels=[0, 1]).ravel())
    return dict(n=len(y), asd=int(sum(y)), tn=tn, fp=fp, fn=fn, tp=tp,
                accuracy=accuracy_score(y, decisions), balanced_accuracy=balanced_accuracy_score(y, decisions),
                sensitivity=tp/(fn+tp), specificity=tn/(fp+tn), auc=roc_auc_score(y, scores),
                average_precision=average_precision_score(y, scores), brier=brier_score_loss(y, scores))


def write_csv(path, header, rows):
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(header)
        writer.writerows(rows)


def center_interval(y, decisions, groups):
    """Resample whole centers; uncertainty conditional on the existing held-out fits."""
    matrices = np.array([confusion_matrix(y[groups == s], decisions[groups == s], labels=[0, 1]).ravel()
                         for s in np.unique(groups)])
    rng = np.random.default_rng(SEED)
    indices = rng.integers(len(matrices), size=(4000, len(matrices)))
    tn, fp, fn, tp = matrices[indices].sum(axis=1).T
    return np.quantile((tp/(tp+fn) + tn/(tn+fp))/2, [.025, .975]).tolist()


def main():
    CACHE.mkdir(exist_ok=True)
    OUT.mkdir(exist_ok=True)
    records, external, audit = cohort()
    write_csv(CACHE / "clinical.csv", ["participant", "site", "age", "asd", *FIELDS], records)
    x = np.array([r[4:] for r in records])
    y = np.array([r[3] for r in records])
    groups = np.array([r[1] for r in records])
    totals = x.sum(axis=1, keepdims=True)
    scores, decisions, baseline, prior = [np.zeros(len(y)) for _ in range(4)]
    folds = {}
    for site in np.unique(groups):
        test = groups == site
        assert len(np.unique(y[test])) == 2
        name, threshold, search = train_choice(x[~test], y[~test], groups[~test])
        scores[test] = fit_predict(MODELS[name], x[~test], y[~test], x[test])
        decisions[test] = scores[test] >= threshold
        baseline[test] = fit_predict(logistic(1), totals[~test], y[~test], totals[test])
        prior[test] = y[~test].mean()
        folds[site] = dict(model=name, threshold=threshold, search=search,
                           metrics=metrics(y[test], scores[test], decisions[test]))
    name, threshold, search = train_choice(x, y, groups)
    fitted = clone(MODELS[name]).fit(x, y)
    artifact = dict(model=fitted, feature_order=FIELDS, minimum=x.min(axis=0), maximum=x.max(axis=0),
                    threshold=threshold, source="ABIDE II",
                    target="dx_group == 1", sklearn=sklearn.__version__)
    joblib.dump(artifact, OUT / "srs_model.joblib")
    restored = joblib.load(OUT / "srs_model.joblib")
    assert np.array_equal(restored["model"].predict_proba(x), fitted.predict_proba(x))
    write_csv(CACHE / "held_out.csv", ["participant","site","target","score","decision","total_baseline"],
              [(r[0],r[1],r[3],p,int(d),b) for r,p,d,b in zip(records,scores,decisions,baseline)])
    ext_x, ext_y = np.array(external).T
    total_model = logistic(1).fit(totals, y)
    total_path = OUT / "srs_total_model.joblib"
    joblib.dump(dict(model=total_model, feature_order=["srs_total_raw"],
                     minimum=totals.min(axis=0), maximum=totals.max(axis=0),
                     threshold=.5, source="ABIDE II", target="dx_group == 1",
                     sklearn=sklearn.__version__), total_path)
    ext_scores = joblib.load(total_path)["model"].predict_proba(ext_x[:, None])[:, 1]
    assert np.array_equal(ext_scores, total_model.predict_proba(ext_x[:, None])[:, 1])
    local = json.loads((ROOT / "private/neura.json").read_text(encoding="utf-8"))
    assert all(r["diagnosis"] is None for r in local["rows"])
    synthetic_rows = generate(CACHE / "synthetic.json")
    family = train_family(local["rows"], ROOT/"private/labels.csv", ROOT/"private/family_model.joblib")
    result = dict(protocol="nested-leave-one-center-out-v1", seed=SEED, sources=MANIFEST, audit=audit,
                  ages=[min(r[2] for r in records),max(r[2] for r in records)],
                  age_under_6=sum(r[2]<6 for r in records), folds=folds,
                  center_interval=center_interval(y, decisions, groups),
                  primary=metrics(y,scores,decisions), baseline=metrics(y,baseline,baseline>=.5),
                  prevalence_baseline=metrics(y,prior,prior>=.5),
                  yale_total_only=metrics(ext_y,ext_scores,ext_scores>=.5),
                  selection=dict(model=name,threshold=threshold,search=search),
                  local=dict(rows=len(local["rows"]), sources=dict(Counter(r["source"] for r in local["rows"])),
                             instruments=dict(Counter(r["instrument"] for r in local["rows"])), skipped=local["counts"]),
                  family=family, synthetic_rows=synthetic_rows, python=platform.python_version(), sklearn=sklearn.__version__,
                  cohort_sha256=digest((CACHE/"clinical.csv").read_bytes()))
    (OUT/"metrics.json").write_text(json.dumps(result, indent=2, allow_nan=False), encoding="utf-8")
    from report import render
    (OUT/"report.md").write_text(render(result), encoding="utf-8")
    print((OUT/"report.md").resolve())


if __name__ == "__main__":
    main()

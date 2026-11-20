"""Optional experimental joint model for matched, independently labelled family assessments."""
import csv
from collections import Counter, defaultdict

import joblib
import numpy as np
from sklearn.base import clone
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import balanced_accuracy_score, confusion_matrix
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder

KINDS = ("family-questionnaire-v1", "family-game-v1")


def estimator():
    return make_pipeline(OneHotEncoder(categories=[[0, 1, 2]]*6), LogisticRegression(max_iter=1000))


def pairs(rows):
    visits = defaultdict(dict)
    for row in rows:
        if row["source"] != "local_unverified" or row["instrument"] not in KINDS or not row["assessment"]:
            continue
        key = row["participant"], row["assessment"]
        if row["instrument"] in visits[key]:
            raise ValueError("Duplicate family assignment in assessment")
        visits[key][row["instrument"]] = row["features"]
    return {k: [v[kind][f"step{i}"] for kind in KINDS for i in range(3)]
            for k, v in visits.items() if all(kind in v for kind in KINDS)}


def run(rows, label_file, model_file):
    matched = pairs(rows)
    summary = dict(pairs=len(matched), labelled=0, fitted=False)
    if not label_file.exists():
        summary["reason"] = "Нет файла независимых меток."
        model_file.unlink(missing_ok=True)
        return summary
    labels = {}
    with label_file.open(encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream):
            key = row["participant"], row["assessment"]
            if key in labels or row["asd"] not in {"0", "1"} or key not in matched:
                raise ValueError("Несовместимая, дублированная или несопоставленная метка семейного обследования")
            labels[key] = int(row["asd"])
    ordered = sorted(labels)
    summary["labelled"] = len(ordered)
    # Count distinct children in each class before attempting grouped validation.
    subjects = defaultdict(set)
    for key in ordered:
        subjects[key[0]].add(labels[key])
    if any(len(values) != 1 for values in subjects.values()):
        raise ValueError("Расхождение меток одного ребёнка")
    sizes = Counter(next(iter(v)) for v in subjects.values())
    k = min(5, sizes[0], sizes[1])
    if k < 2:
        summary["reason"] = "Для групповой проверки требуются минимум два разных ребёнка каждого класса."
        model_file.unlink(missing_ok=True)
        return summary
    # One child contributes one matched visit, with deterministic selection independent of answers.
    first = {}
    for key in ordered:
        first.setdefault(key[0], key)
    selected = list(first.values())
    x = np.array([matched[key] for key in selected])
    y = np.array([labels[key] for key in selected])
    groups = np.array([key[0] for key in selected])
    folds = StratifiedKFold(n_splits=k, shuffle=True, random_state=718)
    model = estimator()
    pred = np.zeros(len(y), dtype=int)
    for train, test in folds.split(x, y):
        assert set(groups[train]).isdisjoint(groups[test])
        pred[test] = clone(model).fit(x[train], y[train]).predict(x[test])
    joblib.dump(dict(model=model.fit(x, y), instruments=KINDS,
                     fields=["step0", "step1", "step2"]), model_file)
    summary.update(fitted=True, children=len(y), folds=k, balanced_accuracy=balanced_accuracy_score(y, pred),
                   confusion_matrix=confusion_matrix(y, pred, labels=[0, 1]).tolist())
    return summary

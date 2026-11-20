"""Score one research SRS profile from raw subscales or the raw total."""
import argparse
import json
from pathlib import Path

import joblib
import numpy as np


def score(profile, artifact):
    fields = artifact["feature_order"]
    if not isinstance(profile, dict) or set(profile) != set(fields):
        raise ValueError("Ожидаемые поля: " + ", ".join(fields))
    values = [profile[f] for f in fields]
    if not all(type(v) is int and v >= 0 for v in values) or sum(values) > 195:
        raise ValueError("Сырые баллы должны быть целыми, неотрицательными, с суммой до 195")
    vector = np.array(values)
    outside = (vector < artifact["minimum"]) | (vector > artifact["maximum"])
    if outside.any():
        raise ValueError("Вне наблюдавшегося диапазона обучения: " +
                         ", ".join(field for field, flag in zip(fields, outside) if flag))
    value = float(artifact["model"].predict_proba(vector[None, :])[0, 1])
    return dict(research_score=value, threshold=artifact["threshold"],
                above_threshold=value >= artifact["threshold"], reference="ABIDE II / SRS")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("profile", type=Path, nargs="?")
    parser.add_argument("--demo", choices=["A", "B", "C"])
    parser.add_argument("--total", action="store_true", help="Использовать модель по сумме SRS")
    args = parser.parse_args()
    filename = "srs_total_model.joblib" if args.total else "srs_model.joblib"
    saved = Path(__file__).resolve().parent / "results" / filename
    try:
        if args.demo:
            if args.total or args.profile:
                parser.error("--demo requires the five-scale model and no input file")
            sample = json.loads((saved.parents[1]/"example-srs.json").read_text())
            factor = {"A": .6, "B": 1, "C": 1.4}[args.demo]
            profile = {field: round(value * factor) for field, value in sample.items()}
            result = dict(profile=profile, **score(profile, joblib.load(saved)))
        else:
            if not args.profile:
                parser.error("Specify a profile or --demo")
            result = score(json.loads(args.profile.read_text(encoding="utf-8-sig")), joblib.load(saved))
        print(json.dumps(result))
    except (ValueError, OSError) as error:
        parser.exit(2, str(error) + "\n")

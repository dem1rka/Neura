"""Exercise the family estimator with two artificial answer-generation patterns."""
import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import accuracy_score

from family import KINDS, estimator


def examples(seed, n):
    rng = np.random.default_rng(seed)
    mode = np.repeat([0, 1], n // 2)
    rng.shuffle(mode)
    # Both modes can produce every answer. Their preferred options are arbitrary.
    patterns = np.array([[0, 1, 2, 2, 1, 0], [2, 0, 1, 0, 2, 1]])
    answers = np.where(rng.random((n, 6)) < .38, patterns[mode], rng.integers(3, size=(n, 6)))
    return answers, mode


def main():
    out = Path(__file__).resolve().parent / "results"
    out.mkdir(exist_ok=True)
    train, target = examples(718, 1000)
    test, expected = examples(719, 250)
    model = estimator().fit(train, target)
    path = out / "family_synthetic_demo.joblib"
    joblib.dump(dict(model=model, source="synthetic", target="generator_mode",
                     instruments=KINDS, fields=["step0", "step1", "step2"]), path)
    predicted = joblib.load(path)["model"].predict(test)
    assert np.array_equal(predicted, model.predict(test))
    result = dict(source="synthetic", target="generator_mode", independent_test_seed=719,
                  train_seed=718, train_pairs=len(train), test_pairs=len(test),
                  accuracy=accuracy_score(expected, predicted))
    (out / "family_synthetic_demo.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result))


if __name__ == "__main__":
    main()

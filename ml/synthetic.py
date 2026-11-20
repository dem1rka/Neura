"""Paired software fixtures for the two Neura workspace instruments."""
import json
import random


def generate(path, n=100, seed=718):
    rng = random.Random(seed)
    rows = []
    for i in range(n):
        participant = f"synthetic-{i:04}"
        answers = {f"q{j}": rng.choice([0, 1, 2, 3, None]) for j in range(10)}
        choices = {f"choice{j}": rng.randrange(4) for j in range(7)}
        choices.update(choice7=rng.choice([0, 1, 2, 4]), emotion3=rng.randrange(4))
        choices.update(seconds=rng.randint(45, 600), changes=rng.randrange(12), help=rng.randrange(8))
        for instrument, features in [("workspace-questionnaire-v1", answers), ("workspace-party-v1", choices)]:
            rows.append(dict(participant=participant, assessment=None, source="synthetic",
                             instrument=instrument, features=features, diagnosis=None))
    path.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    return len(rows)

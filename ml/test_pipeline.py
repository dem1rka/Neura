import csv
import json
import tempfile
import unittest
from pathlib import Path

import joblib

from family import KINDS, pairs, run
from score import score
from synthetic import generate
from train import OUT, ROOT, cohort


class PipelineChecks(unittest.TestCase):
    def test_source_and_held_out_population(self):
        rows, external, audit = cohort()
        with (ROOT/"cache/held_out.csv").open() as stream:
            predictions = list(csv.DictReader(stream))
        self.assertEqual(sorted(r[0] for r in rows), sorted(r["participant"] for r in predictions))
        self.assertEqual(len(rows), len(set(r[0] for r in rows)))
        self.assertTrue(all(3 <= r[2] < 12 for r in rows))
        self.assertTrue(all(r[1] != "ABIDEII-TCD_1" for r in rows))
        self.assertTrue(audit["ABIDEII-TCD_1.tsv"]["srs_used_in_control_selection"] > 0)
        self.assertEqual(set(label for _,label in external), {0,1})

    def test_score_contract(self):
        artifact = joblib.load(OUT/"srs_model.joblib")
        profile = json.loads((ROOT/"example-srs.json").read_text())
        self.assertTrue(0 <= score(profile, artifact)["research_score"] <= 1)
        for invalid in [{}, dict(profile, diagnosis=1), dict(profile,srs_motivation_raw=None),
                        dict(profile,srs_cognition_raw=10000)]:
            with self.assertRaises(ValueError):
                score(invalid, artifact)

    def test_synthetic_reproduction(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/"synthetic.json"
            generate(path, n=6)
            previous = path.read_bytes()
            generate(path, n=6)
            self.assertEqual(path.read_bytes(), previous)
            rows = json.loads(previous)
            self.assertTrue(all(r["source"] == "synthetic" and r["diagnosis"] is None for r in rows))
            self.assertFalse(pairs(rows))

    def test_joint_model_uses_matched_visits_and_distinct_children(self):
        rows, labels = [], []
        for i in range(12):
            for visit in ("a","b"):
                labels.append(f"{i},{visit},{i%2}")
                for kind in KINDS:
                    rows.append(dict(participant=str(i), assessment=visit, source="local_unverified",
                                     instrument=kind, features=dict(step0=i%3,step1=0,step2=1)))
        with tempfile.TemporaryDirectory() as directory:
            label_file, model = [Path(directory)/n for n in ["labels.csv","model.joblib"]]
            self.assertFalse(run(rows, label_file, model)["fitted"])
            label_file.write_text("participant,assessment,asd\n"+"\n".join(labels))
            result = run(rows, label_file, model)
            self.assertEqual((result["pairs"], result["children"]), (24,12))
            self.assertTrue(model.is_file())
            rows[0]["source"] = "local_demo"
            with self.assertRaises(ValueError):
                run(rows, label_file, model)

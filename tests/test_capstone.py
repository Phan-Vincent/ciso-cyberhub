import json
import tempfile
import unittest
from pathlib import Path
from hub.validate import validate_capstone
from hub.common import ROOT


class CapstoneValidation(unittest.TestCase):
    def setUp(self):
        self.original = json.loads((ROOT / 'data/capstone.json').read_text())

    def validate(self, case):
        with tempfile.TemporaryDirectory() as folder:
            data = Path(folder) / 'data'
            data.mkdir()
            (data / 'capstone.json').write_text(json.dumps(case))
            return validate_capstone(Path(folder))

    def test_valid_and_renamed_case(self):
        self.assertEqual(validate_capstone(ROOT)['id'], 'inland-vpn')
        case = json.loads(json.dumps(self.original))
        case['id'] = 'another-case'
        self.assertEqual(self.validate(case)['id'], 'another-case')

    def test_broken_carry_and_missing_line_fail(self):
        for mutation in ('carry', 'line'):
            case = json.loads(json.dumps(self.original))
            if mutation == 'carry':
                case['stages'][2]['questions'][0]['carry'] = 'missing-question'
            else:
                case['stages'][3]['questions'][0]['answer'] = 'A99'
            with self.assertRaises(ValueError): self.validate(case)

    def test_derived_is_data_driven_and_aliases_stay_equivalent(self):
        case = json.loads(json.dumps(self.original))
        interval = case['stages'][2]['questions'][0]
        interval['id'] = 'cadence'
        self.validate(case)
        del interval['derived']
        with self.assertRaises(ValueError): self.validate(case)
        interval['derived'] = True
        interval['accept'] = ['30 seconds']
        with self.assertRaises(ValueError): self.validate(case)

    def test_exact_answer_and_next_stage_evidence_required(self):
        case = json.loads(json.dumps(self.original))
        case['stages'][2]['questions'][2]['answer'] = '192.0.2.99'
        with self.assertRaises(ValueError): self.validate(case)
        case = json.loads(json.dumps(self.original))
        case['stages'][3]['evidence'] = [x.replace('192.0.2.42','192.0.2.99') for x in case['stages'][3]['evidence']]
        with self.assertRaises(ValueError): self.validate(case)

import re
import unittest
from pathlib import Path

from hub.linux import MODULES, level_ids
from hub import netlab, pslab


class LinuxLabTest(unittest.TestCase):
    def test_ids_match_shell_levels(self):
        ts = (Path(__file__).resolve().parents[1] / 'web/linux.ts').read_text()
        ts_ids = re.findall(r"\{ id: '([a-z0-9-]+)'", ts)
        self.assertEqual(sorted(level_ids() + netlab.level_ids()), sorted(ts_ids))
        self.assertFalse(set(level_ids()) & set(netlab.level_ids()))
        self.assertEqual(len(level_ids()), len(set(level_ids())))

    def test_every_level_has_lesson_goal_and_hints(self):
        for _mid, _title, _desc, levels in MODULES + netlab.MODULES + pslab.MODULES:
            for lid, title, lesson, goal, hints in levels:
                self.assertTrue(title and lesson and goal and hints, lid)


if __name__ == '__main__':
    unittest.main()


class PowerShellLabTest(unittest.TestCase):
    def test_ids_match(self):
        ts = (Path(__file__).resolve().parents[1] / 'web/pslab.ts').read_text()
        self.assertEqual(sorted(pslab.level_ids()), sorted(re.findall(r"\{ id: '(ps-[a-z0-9-]+)'", ts)))


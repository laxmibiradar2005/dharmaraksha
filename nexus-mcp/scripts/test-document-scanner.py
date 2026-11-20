"""Synthetic image tests: no private camera images or cloud services."""
import importlib.util
from pathlib import Path
import unittest
import cv2
import numpy as np

spec = importlib.util.spec_from_file_location('scanner', Path(__file__).with_name('document-scanner.py'))
scanner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scanner)


class ScannerTests(unittest.TestCase):
    def page(self):
        image = np.full((1080, 1920, 3), 35, np.uint8)
        cv2.rectangle(image, (560, 60), (1330, 1020), (235, 235, 235), -1)
        for row in range(140, 960, 40):
            cv2.putText(image, 'Document line 123 - example text', (590, row), cv2.FONT_HERSHEY_SIMPLEX, .85, (20, 20, 20), 2, cv2.LINE_AA)
        return image

    def test_clear_complete_page(self):
        _, crop, result, marker = scanner.inspect(self.page())
        self.assertTrue(result['ready'], result)
        self.assertIsNotNone(crop)
        self.assertIsNotNone(marker)

    def test_blank_scene(self):
        _, crop, result, _ = scanner.inspect(np.full((1080,1920,3),80,np.uint8))
        self.assertFalse(result['ready'])
        self.assertIsNone(crop)

    def test_blur_rejected(self):
        _, _, result, _ = scanner.inspect(cv2.GaussianBlur(self.page(), (45,45), 15))
        self.assertFalse(result['ready'], result)

    def test_low_contrast_rejected(self):
        image=self.page()
        image[image<100]=220
        image[:, :500]=35
        image[:, 1400:]=35
        _, _, result, _=scanner.inspect(image)
        self.assertFalse(result['ready'], result)

    def test_cut_off_page(self):
        image=self.page()[150:]
        _, _, result, _=scanner.inspect(image)
        self.assertFalse(result['ready'],result)


if __name__=='__main__': unittest.main()

rule TrainingMarker {
    meta:
        description = "Harmless CyberHub training marker; not a malware detector"
    strings:
        $marker = "CYBERHUB_TRAINING_MARKER"
    condition:
        $marker
}

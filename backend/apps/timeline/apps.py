from django.apps import AppConfig


class TimelineConfig(AppConfig):
    name = 'apps.timeline'

    def ready(self):
        import apps.timeline.signals


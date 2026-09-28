from datetime import date
from unittest.mock import patch

from django.test import SimpleTestCase
from django.urls import reverse

from assets.reporting import ReportPayload


class ExportReportMonthlyRangeTests(SimpleTestCase):
    @patch("assets.views.render_report_pdf", return_value=b"%PDF-1.4")
    @patch(
        "assets.views.build_tasks_payload",
        return_value=ReportPayload(
            title="Tasks Report",
            subtitle="stub",
            summary=[],
            columns=[],
            rows=[],
        ),
    )
    def test_monthly_frequency_without_dates_uses_full_current_month(
        self, mock_build_tasks_payload, _mock_render_pdf
    ):
        today = date.today()
        month_start = today.replace(day=1)
        if today.month == 12:
            next_month_start = date(today.year + 1, 1, 1)
        else:
            next_month_start = date(today.year, today.month + 1, 1)
        month_end = date.fromordinal(next_month_start.toordinal() - 1)

        response = self.client.get(
            reverse("export-report"),
            {"type": "tasks", "frequency": "monthly", "module": "vehicle-assets"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(mock_build_tasks_payload.called)
        _, frequency, date_from, date_to, _ = mock_build_tasks_payload.call_args.args
        self.assertEqual(frequency, "monthly")
        self.assertEqual(date_from, month_start)
        self.assertEqual(date_to, month_end)

    @patch("assets.views.render_report_pdf", return_value=b"%PDF-1.4")
    @patch(
        "assets.views.build_tasks_payload",
        return_value=ReportPayload(
            title="Tasks Report",
            subtitle="stub",
            summary=[],
            columns=[],
            rows=[],
        ),
    )
    def test_monthly_frequency_with_anchor_date_expands_to_anchor_month(
        self, mock_build_tasks_payload, _mock_render_pdf
    ):
        response = self.client.get(
            reverse("export-report"),
            {
                "type": "tasks",
                "frequency": "monthly",
                "date_from": "2026-04-15",
                "module": "vehicle-assets",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(mock_build_tasks_payload.called)
        _, frequency, date_from, date_to, _ = mock_build_tasks_payload.call_args.args
        self.assertEqual(frequency, "monthly")
        self.assertEqual(date_from.isoformat(), "2026-04-15")
        self.assertEqual(date_to.isoformat(), "2026-04-30")

    @patch("assets.views.render_report_pdf", return_value=b"%PDF-1.4")
    @patch(
        "assets.views.build_tasks_payload",
        return_value=ReportPayload(
            title="Tasks Report",
            subtitle="stub",
            summary=[],
            columns=[],
            rows=[],
        ),
    )
    def test_monthly_frequency_with_explicit_range_keeps_cross_month_window(
        self, mock_build_tasks_payload, _mock_render_pdf
    ):
        response = self.client.get(
            reverse("export-report"),
            {
                "type": "tasks",
                "frequency": "monthly",
                "date_from": "2026-03-01",
                "date_to": "2026-05-31",
                "module": "vehicle-assets",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(mock_build_tasks_payload.called)
        _, frequency, date_from, date_to, _ = mock_build_tasks_payload.call_args.args
        self.assertEqual(frequency, "monthly")
        self.assertEqual(date_from.isoformat(), "2026-03-01")
        self.assertEqual(date_to.isoformat(), "2026-05-31")

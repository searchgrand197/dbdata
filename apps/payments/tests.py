from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.payments.models import CashHandover
from apps.shared.models import Hospital


User = get_user_model()


class CashHandoverFlowTests(APITestCase):
    def setUp(self):
        self.hospital = Hospital.objects.create(name="Test Hospital", slug="test-hospital")
        self.other_hospital = Hospital.objects.create(name="Other Hospital", slug="other-hospital")
        self.user_a = User.objects.create_user(
            email="a@example.com",
            password="Password@123",
            hospital=self.hospital,
            first_name="User",
            last_name="A",
        )
        self.user_b = User.objects.create_user(
            email="b@example.com",
            password="Password@123",
            hospital=self.hospital,
            first_name="User",
            last_name="B",
        )
        self.user_c = User.objects.create_user(
            email="c@example.com",
            password="Password@123",
            hospital=self.hospital,
            first_name="User",
            last_name="C",
        )
        self.user_other_hospital = User.objects.create_user(
            email="other@example.com",
            password="Password@123",
            hospital=self.other_hospital,
            first_name="Other",
            last_name="Hospital",
        )

    def test_only_recipient_can_verify_handover(self):
        handover = CashHandover.objects.create(
            hospital=self.hospital,
            from_user=self.user_a,
            to_user=self.user_b,
            system_cash_amount=Decimal("1000.00"),
            declared_cash_amount=Decimal("1000.00"),
            status=CashHandover.Status.PENDING,
        )

        self.client.force_authenticate(user=self.user_c)
        response = self.client.post(
            "/api/v1/handovers/verify/",
            {"handover_id": str(handover.id), "action": "accept"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)
        handover.refresh_from_db()
        self.assertEqual(handover.status, CashHandover.Status.PENDING)

    def test_accept_flow_sets_opening_cash_and_resets_after_next_handover(self):
        self.client.force_authenticate(user=self.user_a)
        create_response = self.client.post(
            "/api/v1/handovers/initiate/",
            {
                "to_user_id": str(self.user_b.id),
                "declared_cash_amount": "1500.00",
                "notes": "Shift handover",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        handover_id = create_response.data["data"]["id"]

        self.client.force_authenticate(user=self.user_b)
        accept_response = self.client.post(
            "/api/v1/handovers/verify/",
            {"handover_id": handover_id, "action": "accept"},
            format="json",
        )
        self.assertEqual(accept_response.status_code, 200)

        # Receiver starts with accepted opening cash in hand.
        b_balance = self.client.get("/api/v1/handovers/balance/")
        self.assertEqual(b_balance.status_code, 200)
        self.assertEqual(b_balance.data["data"]["collection"]["opening_cash_in_hand"], "1500.00")
        self.assertEqual(b_balance.data["data"]["collection"]["cash_total"], "1500.00")

        # B now hands over to C and once accepted, B collection resets to zero.
        initiate_b_to_c = self.client.post(
            "/api/v1/handovers/initiate/",
            {
                "to_user_id": str(self.user_c.id),
                "declared_cash_amount": "1500.00",
            },
            format="json",
        )
        self.assertEqual(initiate_b_to_c.status_code, 201)
        b_to_c_id = initiate_b_to_c.data["data"]["id"]

        self.client.force_authenticate(user=self.user_c)
        accept_b_to_c = self.client.post(
            "/api/v1/handovers/verify/",
            {"handover_id": b_to_c_id, "action": "accept"},
            format="json",
        )
        self.assertEqual(accept_b_to_c.status_code, 200)

        self.client.force_authenticate(user=self.user_b)
        b_after_reset = self.client.get("/api/v1/handovers/balance/")
        self.assertEqual(b_after_reset.status_code, 200)
        self.assertEqual(b_after_reset.data["data"]["collection"]["opening_cash_in_hand"], "0.00")
        self.assertEqual(b_after_reset.data["data"]["collection"]["cash_total"], "0.00")

    def test_cross_hospital_user_not_visible_or_selectable(self):
        self.client.force_authenticate(user=self.user_a)
        balance_response = self.client.get("/api/v1/handovers/balance/")
        self.assertEqual(balance_response.status_code, 200)

        recipient_ids = {row["id"] for row in balance_response.data["data"]["handover_recipients"]}
        self.assertIn(str(self.user_b.id), recipient_ids)
        self.assertIn(str(self.user_c.id), recipient_ids)
        self.assertNotIn(str(self.user_other_hospital.id), recipient_ids)

        initiate_cross_hospital = self.client.post(
            "/api/v1/handovers/initiate/",
            {
                "to_user_id": str(self.user_other_hospital.id),
                "declared_cash_amount": "500.00",
            },
            format="json",
        )
        self.assertEqual(initiate_cross_hospital.status_code, 404)

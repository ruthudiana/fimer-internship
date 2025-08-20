import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime
import random
import string

class TestRun(Document):
    def autoname(self):
        username = (self.test_executed_by or frappe.session.user or "user").split("@")[0]
        timestamp = now_datetime().strftime("%Y%m%d%H%M%S")
        rand_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
        self.name = f"{username}-{timestamp}-{rand_suffix}"
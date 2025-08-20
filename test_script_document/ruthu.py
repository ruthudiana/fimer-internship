import frappe
from frappe.model.document import Document

@frappe.whitelist()
def get_template(template_id):
    template = frappe.get_doc("Test Script Template", template_id)
    return [d.as_dict() for d in template.test_script]

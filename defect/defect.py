import frappe
from frappe.model.document import Document
from frappe.utils import get_url

class Defect(Document):
    def after_insert(self):
        # Do nothing on creation — no email should be sent here
        pass

    def on_update(self):
        before_doc = self.get_doc_before_save()
        # Only send email if this is an update (not creation)
        if before_doc:
            old_assigned_to = before_doc.assigned_to or ""
            new_assigned_to = self.assigned_to or ""
            if old_assigned_to != new_assigned_to and self.is_valid_email(new_assigned_to):
                send_defect_email(self.name)

    def is_valid_email(self, email):
        """Simple validation to check if the string looks like an email"""
        return "@" in email and "." in email

@frappe.whitelist()
def send_defect_email(defect_name):
    try:
        doc = frappe.get_doc("Defect", defect_name)
        # Send email only if assigned_to is a direct email
        if not doc.assigned_to or "@" not in doc.assigned_to:
            return

        recipient_email = doc.assigned_to
        # CC only if assigned_by is a direct email
        cc_email = None
        if doc.assigned_by and "@" in doc.assigned_by:
            cc_email = doc.assigned_by

        # Prepare attachments list
        attachment_links = "None"
        if doc.get("attachments"):
            attachment_links = "<ul>"
            for file in doc.get("attachments"):
                if file.file_url and file.file_name:
                    attachment_links += f"<li><a href='{get_url()}{file.file_url}' target='_blank'>{file.file_name}</a></li>"
            attachment_links += "</ul>"

        # Construct message body
        message = f"""
            <h3>Defect Assigned to You</h3>
            <p>
            <b>Test Case ID:</b> {doc.test_case_id or '-'}<br>
            <b>Title:</b> {doc.test_title or '-'}<br>
            <b>Description:</b> {doc.test_description or '-'}<br>
            <b>Severity:</b> {doc.severity or '-'}<br>
            <b>Priority:</b> {doc.priority or '-'}<br>
            <b>Expected Result:</b> {doc.expected_result or '-'}<br>
            <b>Actual Result:</b> {doc.actual_result or '-'}<br>
            <b>Comments:</b> {doc.comments or '-'}<br>
            <b>Notes:</b> {doc.notes or '-'}<br>
            <b>Attachments:</b><br>{attachment_links}<br>
            </p>
            <hr>
            <p><a href="{get_url()}/app/defect/{doc.name}" target="_blank">Open Defect in ERP</a></p>
        """

        frappe.sendmail(
            recipients=[recipient_email],
            cc=[cc_email] if cc_email else None,
            subject=f"[Defect] {doc.test_case_id or doc.name} - {doc.test_title or 'Untitled'}",
            message=message,
            delayed=False
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Defect Email Sending Failed")
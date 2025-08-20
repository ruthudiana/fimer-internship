import frappe
import json

@frappe.whitelist()
def create_defect_from_test_run(child_row_name, parent_name):
    # Fetch the Test Run document
    test_run = frappe.get_doc("Test Run", parent_name)
    
    # Make sure the child row exists
    test_row = next((row for row in test_run.test_outcomes if row.name == child_row_name), None)
    if not test_row:
        frappe.throw("Selected test outcome step was not found.")

    # Parse the custom_data field (JSON from dynamic columns)
    details = ""
    if test_row.custom_data:
        try:
            data = json.loads(test_row.custom_data)
            # Format key-value pairs for readability
            details = "\n".join(f"{key}: {value}" for key, value in data.items())
        except Exception:
            details = "Unable to parse test step details."

    # Create a new Defect document
    defect = frappe.new_doc("Defect")
    defect.status = "New"
    defect.priority = "Medium"
    defect.severity = "Moderate"
    defect.build_number = test_run.get("build_number") or ""
    defect.assignee = test_run.get("test_executed_by") or ""

    # Add parsed custom test details to description
    defect.description = f"""Test Step Details:
{details}

Actual Result: {test_row.get('actual_result') or 'N/A'}"""

    # Save and return defect
    defect.insert(ignore_permissions=True)
    frappe.db.commit()
    return defect.name



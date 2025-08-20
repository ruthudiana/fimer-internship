import frappe 
from frappe.model.document import Document
from frappe import _

class TestScriptDocument(Document):
	pass

@frappe.whitelist()
def get_functionality_query(doctype,txt,searchfield,start,page_len,filters):
	department = filters.get("department")
	if not department:
		return[]

	return frappe.db.get_all(
		"Test Functionalities",
		filters={"department": department},
		fields=["name"],
		as_list=True
	)	



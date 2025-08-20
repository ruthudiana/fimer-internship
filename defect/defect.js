frappe.ui.form.on('Defect', {
    onload: function(frm) {
        if (frm.is_new()) {
            frm.set_value('assigned_by', frappe.session.user);
            frm.set_value('test_date', frappe.datetime.nowdate());
        }
        toggle_fields_based_on_data(frm);
    },
    refresh: function(frm) {
        toggle_fields_based_on_data(frm);
    }
});

function toggle_fields_based_on_data(frm) {
    // Removed 'result' field handling as you no longer have that field

    const has_expected = !!frm.doc.expected_result && frm.doc.expected_result.trim() !== '';
    const has_actual = !!frm.doc.actual_result && frm.doc.actual_result.trim() !== '';
    const has_notes = !!frm.doc.notes && frm.doc.notes.trim() !== '';
    const has_comments = !!frm.doc.comments && frm.doc.comments.trim() !== '';

    if (has_expected || has_actual) {
        frm.set_df_property('expected_result', 'hidden', 0);
        frm.set_df_property('actual_result', 'hidden', 0);
    } else {
        frm.set_df_property('expected_result', 'hidden', 1);
        frm.set_df_property('actual_result', 'hidden', 1);
    }

    if (has_notes) {
        frm.set_df_property('notes', 'hidden', 0);
        frm.set_df_property('comments', 'hidden', 1);
    } else if (has_comments) {
        frm.set_df_property('notes', 'hidden', 1);
        frm.set_df_property('comments', 'hidden', 0);
    } else {
        frm.set_df_property('notes', 'hidden', 1);
        frm.set_df_property('comments', 'hidden', 1);
    }
}
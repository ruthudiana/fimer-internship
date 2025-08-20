frappe.ui.form.on('Test Script Document', {
    template_name: async function (frm) {
        if (!frm.doc.template_name) {
            clear_all_child_tables(frm);
            show_only_relevant_child_table(frm, null);
            return;
        }
        try {
            const template = await frappe.db.get_doc('Test Script Template', frm.doc.template_name);
            const template_type = template.template_type || '';
            frm.__current_template_type = template_type;
            clear_all_child_tables(frm);
            if (template_type === 'Test Script') {
                (template.test_script || []).forEach(step => {
                    const row = frm.add_child('test_details');
                    row.test_case_id = step.test_case_id || '';
                    row.test_title = step.test_title || '';
                    row.step_description = step.step_description || '';
                    row.expected_result = step.expected_result || '';
                    row.actual_result = step.actual_result || '';
                });
            }
            if (template_type === 'Marketing') {
                (template.marketing_script || []).forEach(step => {
                    const row = frm.add_child('marketing_test_details');
                    row.test_case_id = step.test_case_id || '';
                    row.test_title = step.test_title || '';
                    row.step_description = step.step_description || '';
                    row.expected_result = step.expected_result || '';
                    row.actual_result = step.actual_result || '';
                    row.notes = step.notes || '';
                });
            }
            if (template_type === 'Production') {
                (template.production_script || []).forEach(step => {
                    const row = frm.add_child('production_test_details');
                    row.test_case_id = step.test_case_id || '';
                    row.test_title = step.test_title || '';
                    row.step_description = step.step_description || '';
                    row.comments = step.comments || '';
                    row.expected_result = step.expected_result || '';
                    row.actual_result = step.actual_result || '';
                });
            }
            frm.refresh_field('test_details');
            frm.refresh_field('marketing_test_details');
            frm.refresh_field('production_test_details');
            show_only_relevant_child_table(frm, template_type);
        } catch (error) {
            console.error('Template Load Error:', error);
            show_only_relevant_child_table(frm, null);
        }
    },
    refresh: function (frm) {
        let type = null;
        if (frm.doc.test_details?.length > 0) {
            type = 'Test Script';
        } else if (frm.doc.marketing_test_details?.length > 0) {
            type = 'Marketing';
        } else if (frm.doc.production_test_details?.length > 0) {
            type = 'Production';
        }
        frm.__current_template_type = type;
        show_only_relevant_child_table(frm, type);
        const has_rows = (
            (frm.doc.test_details && frm.doc.test_details.length > 0) ||
            (frm.doc.marketing_test_details && frm.doc.marketing_test_details.length > 0) ||
            (frm.doc.production_test_details && frm.doc.production_test_details.length > 0)
        );
        if (!frm.is_new() && has_rows && !frm.__run_button_added) {
            frm.add_custom_button('Create Test Run for Selected Steps', () => {
                let grid = null;
                const template_type = frm.__current_template_type;
                if (template_type === 'Test Script') {
                    grid = frm.fields_dict.test_details.grid;
                } else if (template_type === 'Marketing') {
                    grid = frm.fields_dict.marketing_test_details.grid;
                } else if (template_type === 'Production') {
                    grid = frm.fields_dict.production_test_details.grid;
                }
                if (!grid) {
                    frappe.msgprint('No steps loaded.');
                    return;
                }
                const selected_rows = grid.get_selected_children();
                if (selected_rows.length === 0) {
                    frappe.msgprint('Please select at least one test step row.');
                    return;
                }

                frappe.new_doc('Test Run', {
                    script_reference: frm.doc.name,
                    selected_steps_json: JSON.stringify(selected_rows.map(step => ({
                        test_case_id: step.test_case_id,
                        test_title: step.test_title,
                        step_description: step.step_description,
                        expected_result: step.expected_result,
                        actual_result: step.actual_result
                    })))
                });
            });
            frm.__run_button_added = true;
        }
    }
});

function clear_all_child_tables(frm) {
    frm.clear_table('test_details');
    frm.clear_table('marketing_test_details');
    frm.clear_table('production_test_details');
    frm.refresh_field('test_details');
    frm.refresh_field('marketing_test_details');
    frm.refresh_field('production_test_details');
}

function show_only_relevant_child_table(frm, template_type) {
    frm.toggle_display('test_details', template_type === 'Test Script');
    frm.toggle_display('marketing_test_details', template_type === 'Marketing');
    frm.toggle_display('production_test_details', template_type === 'Production');
}
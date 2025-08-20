frappe.ui.form.on('Test Run', {
    onload: function (frm) {
        if (frm.is_new()) {
            frm.set_value('test_executed_by', frappe.session.user);
            frm.set_value('test_date', frappe.datetime.now_datetime());
        }
        frm.set_query('build_number', () => {
            return { filters: { is_active: 1 } };
        });
    },
    script_reference: async function (frm) {
        clear_all_outcome_tables(frm);

        if (frm.doc.selected_steps_json) {
            let selected_steps = [];
            try {
                selected_steps = JSON.parse(frm.doc.selected_steps_json);
            } catch (e) {
                frappe.msgprint("Failed to parse selected steps.");
                toggle_outcome_tables(frm, null);
                return;
            }

            if (!frm.doc.script_reference) {
                frappe.msgprint("Script reference missing.");
                toggle_outcome_tables(frm, null);
                return;
            }

            const test_script_doc = await frappe.db.get_doc('Test Script Document', frm.doc.script_reference);
            const template_doc = await frappe.db.get_doc('Test Script Template', test_script_doc.template_name);
            const template_type = template_doc.template_type || '';
            frm.doc.template_type = template_type;

            let target_table = '';
            if (template_type === 'Test Script') {
                target_table = 'test_outcomes';
            } else if (template_type === 'Marketing') {
                target_table = 'marketing_test_outcomes';
            } else if (template_type === 'Production') {
                target_table = 'production_test_outcomes';
            }

            selected_steps.forEach(step => {
                const row = frm.add_child(target_table);
                row.test_case_id = step.test_case_id || '';
                row.test_title = step.test_title || '';
                row.step_description = step.step_description || '';
                row.expected_result = step.expected_result || '';
                row.actual_result = step.actual_result || '';
            });
            frm.refresh_field(target_table);
            toggle_outcome_tables(frm, template_type);
            return;
        }

        if (!frm.doc.script_reference) {
            toggle_outcome_tables(frm, null);
            return;
        }

        try {
            const test_script_doc = await frappe.db.get_doc('Test Script Document', frm.doc.script_reference);
            const template_doc = await frappe.db.get_doc('Test Script Template', test_script_doc.template_name);
            const template_type = template_doc.template_type || '';
            frm.doc.template_type = template_type;
            let source_table = [];
            let target_table = '';
            if (template_type === 'Test Script') {
                source_table = test_script_doc.test_details || [];
                target_table = 'test_outcomes';
            } else if (template_type === 'Marketing') {
                source_table = test_script_doc.marketing_test_details || [];
                target_table = 'marketing_test_outcomes';
            } else if (template_type === 'Production') {
                source_table = test_script_doc.production_test_details || [];
                target_table = 'production_test_outcomes';
            }
            source_table.forEach(detail => {
                const row = frm.add_child(target_table);
                row.test_case_id = detail.test_case_id || '';
                row.test_title = detail.test_title || '';
                row.step_description = detail.step_description || '';
                row.expected_result = detail.expected_result || '';
                row.actual_result = detail.actual_result || '';
                row.outcome = detail.outcome || '';
                row.notes = detail.notes || '';
                row.comments = detail.comments || '';
            });
            frm.refresh_field('test_outcomes');
            frm.refresh_field('marketing_test_outcomes');
            frm.refresh_field('production_test_outcomes');
            toggle_outcome_tables(frm, template_type);
        } catch (error) {
            frappe.msgprint("Failed to load Test Script Document or Template.");
            console.error(error);
        }
    },
    refresh: function (frm) {
        add_raise_defect_button(frm);
    },
    after_save: function (frm) {
        frappe.set_route('List', frm.doctype);
    }
});

function clear_all_outcome_tables(frm) {
    frm.clear_table('test_outcomes');
    frm.clear_table('marketing_test_outcomes');
    frm.clear_table('production_test_outcomes');
    frm.refresh_field('test_outcomes');
    frm.refresh_field('marketing_test_outcomes');
    frm.refresh_field('production_test_outcomes');
}

function toggle_outcome_tables(frm, template_type) {
    frm.toggle_display('test_outcomes', template_type === 'Test Script');
    frm.toggle_display('marketing_test_outcomes', template_type === 'Marketing');
    frm.toggle_display('production_test_outcomes', template_type === 'Production');
}

function add_raise_defect_button(frm) {
    frm.remove_custom_button('Raise Defect for Selected Step');
    frm.add_custom_button('Raise Defect for Selected Step', () => {
        let grid = null;
        if (frm.fields_dict.test_outcomes.grid.wrapper.is(':visible')) {
            grid = frm.fields_dict.test_outcomes.grid;
        } else if (frm.fields_dict.marketing_test_outcomes.grid.wrapper.is(':visible')) {
            grid = frm.fields_dict.marketing_test_outcomes.grid;
        } else if (frm.fields_dict.production_test_outcomes.grid.wrapper.is(':visible')) {
            grid = frm.fields_dict.production_test_outcomes.grid;
        }
        if (!grid) {
            frappe.msgprint("Please load a script first.");
            return;
        }
        const selected_rows = grid.get_selected_children();
        if (selected_rows.length === 0) {
            frappe.msgprint("Please select one test step row.");
            return;
        }
        if (selected_rows.length > 1) {
            frappe.msgprint("Please select only one test step row to raise a defect at a time.");
            return;
        }
        const row = selected_rows[0];
        if ((row.outcome || '').toLowerCase() !== 'fail') {
            frappe.msgprint("Defect can only be raised for a test step row marked as 'Fail'.");
            return;
        }
        let defect_doc = {
            doctype: 'Defect',
            status: 'New',
            priority: 'Medium',
            severity: 'Moderate',
            build_number: frm.doc.build_number || '',
            assigned_to: '',
            assigned_by: frappe.session.user,
            test_run: frm.doc.name,
            test_case_id: row.test_case_id || '',
            test_title: row.test_title || '',
            test_description: row.step_description || '',
            expected_result: row.expected_result || '',
            actual_result: row.actual_result || ''
        };
        if (frm.doc.template_type === 'Marketing') {
            defect_doc.notes = row.notes || '';
        } else if (frm.doc.template_type === 'Production') {
            defect_doc.comments = row.comments || '';
            defect_doc.expected_result = row.expected_result || '';
            defect_doc.actual_result = row.actual_result || '';
        }
        frappe.call({
            method: 'frappe.client.insert',
            args: { doc: defect_doc },
            callback: function (r) {
                if (r.message) {
                    frappe.msgprint("Defect created successfully.");
                    frappe.set_route('Form', 'Defect', r.message.name);
                }
            }
        });
    });
}
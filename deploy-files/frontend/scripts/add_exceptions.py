import os
os.chdir(os.path.dirname(__file__) + "/..")

with open('src/modules/Operation/MawbList.tsx', 'r', encoding='utf-8') as f:
    ml = f.read()

# 1. Update customs modal to add exception section
old_customs = """      {/* Customs Modal */}
      <Modal title={t('operation.steps.customs')} open={customsModalOpen}
        onCancel={() => setCustomsModalOpen(false)} onOk={() => customsForm.submit()}>
        <Form form={customsForm} layout="vertical" onFinish={handleCustoms}>
          <Form.Item name="customsRemark" label="Customs Remark"><Input.TextArea rows={3} placeholder="Cleared without issues?" /></Form.Item>
        </Form>
      </Modal>"""

new_customs = """      {/* Customs Modal */}
      <Modal title={t('operation.steps.customs')} open={customsModalOpen}
        onCancel={() => setCustomsModalOpen(false)} onOk={() => customsForm.submit()}>
        <Form form={customsForm} layout="vertical" onFinish={handleCustoms}>
          <Form.Item name="customsRemark" label="Customs Remark"><Input.TextArea rows={3} placeholder="Cleared without issues?" /></Form.Item>
          <Divider orientation="left" className="text-xs">{t('operation.exception')}</Divider>
          <Form.Item name="customsException" label="Exception Details"><Input.TextArea rows={3} placeholder="Any delays or issues?" /></Form.Item>
        </Form>
      </Modal>"""

if old_customs in ml:
    ml = ml.replace(old_customs, new_customs, 1)
    print('Customs modal updated')
else:
    print('Customs modal: pattern not found')

# 2. Update terminal modal to add exception section
old_terminal = """      {/* Terminal Modal */}
      <Modal title={t('operation.steps.terminal')} open={terminalModalOpen}
        onCancel={() => setTerminalModalOpen(false)} onOk={() => terminalForm.submit()}>
        <Form form={terminalForm} layout="vertical" onFinish={handleTerminal}>
          <Form.Item name="terminalRemark" label="Terminal Remark"><Input.TextArea rows={3} placeholder="Build-up completed?" /></Form.Item>
        </Form>
      </Modal>"""

new_terminal = """      {/* Terminal Modal */}
      <Modal title={t('operation.steps.terminal')} open={terminalModalOpen}
        onCancel={() => setTerminalModalOpen(false)} onOk={() => terminalForm.submit()}>
        <Form form={terminalForm} layout="vertical" onFinish={handleTerminal}>
          <Form.Item name="terminalRemark" label="Terminal Remark"><Input.TextArea rows={3} placeholder="Build-up completed?" /></Form.Item>
          <Divider orientation="left" className="text-xs">{t('operation.exception')}</Divider>
          <Form.Item name="terminalException" label="Exception Details"><Input.TextArea rows={3} placeholder="Any damages or issues at security?" /></Form.Item>
        </Form>
      </Modal>"""

if old_terminal in ml:
    ml = ml.replace(old_terminal, new_terminal, 1)
    print('Terminal modal updated')
else:
    print('Terminal modal: pattern not found')

# 3. Update customs handler to store exception
old_handle_customs = """  // Customs clearance
  const handleCustoms = async (values: any) => {
    if (!selectedMawb) return;
    try {
      await operationApi.updateMawb(selectedMawb.id, {
        status: 'customs',
        remarks: values.customsRemark || '',
      });
      message.success(t('common.success'));
      setCustomsModalOpen(false);
      fetchData();
    } catch {
      message.error(t('common.error'));
    }
  };"""

new_handle_customs = """  // Customs clearance
  const handleCustoms = async (values: any) => {
    if (!selectedMawb) return;
    const exc = values.customsException ? `[Customs Exception] ${values.customsException}` : '';
    try {
      await operationApi.updateMawb(selectedMawb.id, {
        status: 'customs',
        remarks: [values.customsRemark || '', exc].filter(Boolean).join('\\n'),
      });
      message.success(t('common.success'));
      setCustomsModalOpen(false);
      fetchData();
    } catch {
      message.error(t('common.error'));
    }
  };"""

if old_handle_customs in ml:
    ml = ml.replace(old_handle_customs, new_handle_customs, 1)
    print('Customs handler updated')
else:
    print('Customs handler: pattern not found')

# 4. Update terminal handler to store exception
old_handle_terminal = """  // Terminal in
  const handleTerminal = async (values: any) => {
    if (!selectedMawb) return;
    try {
      await operationApi.updateMawb(selectedMawb.id, {
        status: 'terminal_in',
        remarks: values.terminalRemark || '',
      });
      message.success(t('common.success'));
      setTerminalModalOpen(false);
      fetchData();
    } catch {
      message.error(t('common.error'));
    }
  };"""

new_handle_terminal = """  // Terminal in
  const handleTerminal = async (values: any) => {
    if (!selectedMawb) return;
    const exc = values.terminalException ? `[Terminal Exception] ${values.terminalException}` : '';
    try {
      await operationApi.updateMawb(selectedMawb.id, {
        status: 'terminal_in',
        remarks: [values.terminalRemark || '', exc].filter(Boolean).join('\\n'),
      });
      message.success(t('common.success'));
      setTerminalModalOpen(false);
      fetchData();
    } catch {
      message.error(t('common.error'));
    }
  };"""

if old_handle_terminal in ml:
    ml = ml.replace(old_handle_terminal, new_handle_terminal, 1)
    print('Terminal handler updated')
else:
    print('Terminal handler: pattern not found')

# 5. Add exception display to MAWB drawer
# Look for the remarks section in the MAWB drawer and add exception section after it
old_remarks = """            {selectedMawb.remarks && (
              <div className="p-3 border rounded bg-slate-50">
                <Text type="secondary" className="text-xs block mb-1">Remarks</Text>
                <div>{selectedMawb.remarks}</div>
              </div>
            )}"""

new_remarks = """            {selectedMawb.remarks && (
              <div className="p-3 border rounded bg-slate-50">
                <Text type="secondary" className="text-xs block mb-1">Remarks</Text>
                <div>{selectedMawb.remarks}</div>
              </div>
            )}
            {selectedMawb.remarks && selectedMawb.remarks.includes('Exception') && (
              <div className="p-3 border rounded bg-red-50 border-red-200">
                <Text type="danger" className="text-xs block mb-1 font-bold flex items-center gap-1">! {t('operation.exception')}</Text>
                <div className="text-xs text-red-700">{selectedMawb.remarks.split('\\n').filter((l: string) => l.includes('Exception')).map((l: string, i: number) => <div key={i}>{l}</div>)}</div>
              </div>
            )}"""

if old_remarks in ml:
    ml = ml.replace(old_remarks, new_remarks, 1)
    print('Drawer exception section added')
else:
    print('Drawer remarks: pattern not found')
    idx = ml.find('selectedMawb.remarks && (')
    if idx >= 0: print(ml[idx:idx+300])

with open('src/modules/Operation/MawbList.tsx', 'w', encoding='utf-8') as f:
    f.write(ml)
print('MawbList.tsx done')

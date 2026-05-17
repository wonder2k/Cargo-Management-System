import os
os.chdir(os.path.dirname(__file__) + "/..")

with open('src/modules/Operation/MawbList.tsx', 'r', encoding='utf-8') as f:
    ml = f.read()

# 1. Fix warehouse handler: store returnedItems in remarks
old_wh = """      await operationApi.updateMawb(selectedMawb.id, {
        status: 'warehouse_in',
        weight: values.grossWeight,
        chargeableWeight: values.chargeableWeight,
        pieces: values.actualPieces,
        dimensions: values.dims || [],
        remarks: values.remarks || '',
      });"""

new_wh = """      const returnedText = (values.returnedItems || []).map((ri: any) => \`[Returned] \${ri.subMawb}: \${ri.reason}\`).join('\\n');
      await operationApi.updateMawb(selectedMawb.id, {
        status: 'warehouse_in',
        weight: values.grossWeight,
        chargeableWeight: values.chargeableWeight,
        pieces: values.actualPieces,
        dimensions: values.dims || [],
        remarks: [values.remarks || '', returnedText].filter(Boolean).join('\\n'),
      });"""

if old_wh in ml:
    ml = ml.replace(old_wh, new_wh, 1)
    print('Warehouse handler updated')
else:
    print('Warehouse handler: pattern not found')

# 2. Fix customs modal: use returnedItems instead of customsException textarea
old_customs_modal = """          <Form.Item name="customsRemark" label="Customs Remark"><Input.TextArea rows={3} placeholder="Cleared without issues?" /></Form.Item>
          <Divider orientation="left" className="text-xs">{t('operation.exception')}</Divider>
          <Form.Item name="customsException" label="Exception Details"><Input.TextArea rows={3} placeholder="Any delays or issues?" /></Form.Item>
        </Form>
      </Modal>"""

new_customs_modal = """          <Form.Item name="customsRemark" label="Customs Remark"><Input.TextArea rows={3} placeholder="Cleared without issues?" /></Form.Item>
          <Divider orientation="left" className="text-xs">{t('operation.exception')}</Divider>
          <Form.List name="customsReturned">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card key={key} size="small" className="mb-2 bg-red-50">
                    <Row gutter={8}>
                      <Col span={12}><Form.Item {...restField} name={[name, 'subMawb']} label="Sub-ID" rules={[{ required: true }]}><Input /></Form.Item></Col>
                      <Col span={12}><Form.Item {...restField} name={[name, 'reason']} label={t('operation.reason')} rules={[{ required: true }]}><Input /></Form.Item></Col>
                    </Row>
                    <Button size="small" danger onClick={() => remove(name)}>{t('common.delete')}</Button>
                  </Card>
                ))}
                <Button type="link" onClick={() => add()} icon={<Info size={14} />}>{t('operation.returnedItems')}</Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>"""

if old_customs_modal in ml:
    ml = ml.replace(old_customs_modal, new_customs_modal, 1)
    print('Customs modal updated')
else:
    print('Customs modal: pattern not found')

# 3. Fix terminal modal: use returnedItems instead of terminalException textarea
old_terminal_modal = """          <Form.Item name="terminalRemark" label="Terminal Remark"><Input.TextArea rows={3} placeholder="Build-up completed?" /></Form.Item>
          <Divider orientation="left" className="text-xs">{t('operation.exception')}</Divider>
          <Form.Item name="terminalException" label="Exception Details"><Input.TextArea rows={3} placeholder="Any damages or issues at security?" /></Form.Item>
        </Form>
      </Modal>"""

new_terminal_modal = """          <Form.Item name="terminalRemark" label="Terminal Remark"><Input.TextArea rows={3} placeholder="Build-up completed?" /></Form.Item>
          <Divider orientation="left" className="text-xs">{t('operation.exception')}</Divider>
          <Form.List name="terminalReturned">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card key={key} size="small" className="mb-2 bg-red-50">
                    <Row gutter={8}>
                      <Col span={12}><Form.Item {...restField} name={[name, 'subMawb']} label="Sub-ID" rules={[{ required: true }]}><Input /></Form.Item></Col>
                      <Col span={12}><Form.Item {...restField} name={[name, 'reason']} label={t('operation.reason')} rules={[{ required: true }]}><Input /></Form.Item></Col>
                    </Row>
                    <Button size="small" danger onClick={() => remove(name)}>{t('common.delete')}</Button>
                  </Card>
                ))}
                <Button type="link" onClick={() => add()} icon={<Info size={14} />}>{t('operation.returnedItems')}</Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>"""

if old_terminal_modal in ml:
    ml = ml.replace(old_terminal_modal, new_terminal_modal, 1)
    print('Terminal modal updated')
else:
    print('Terminal modal: pattern not found')

# 4. Fix customs handler: merge returnedItems into remarks
old_ch = """  // Customs clearance
  const handleCustoms = async (values: any) => {
    if (!selectedMawb) return;
    const exc = values.customsException ? \`[Customs Exception] \${values.customsException}\` : '';
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

new_ch = """  // Customs clearance
  const handleCustoms = async (values: any) => {
    if (!selectedMawb) return;
    const returnedText = (values.customsReturned || []).map((ri: any) => \`[Customs Exception] \${ri.subMawb}: \${ri.reason}\`).join('\\n');
    try {
      await operationApi.updateMawb(selectedMawb.id, {
        status: 'customs',
        remarks: [values.customsRemark || '', returnedText].filter(Boolean).join('\\n'),
      });
      message.success(t('common.success'));
      setCustomsModalOpen(false);
      fetchData();
    } catch {
      message.error(t('common.error'));
    }
  };"""

if old_ch in ml:
    ml = ml.replace(old_ch, new_ch, 1)
    print('Customs handler updated')
else:
    print('Customs handler: pattern not found')

# 5. Fix terminal handler: merge returnedItems into remarks
old_th = """  // Terminal in
  const handleTerminal = async (values: any) => {
    if (!selectedMawb) return;
    const exc = values.terminalException ? \`[Terminal Exception] \${values.terminalException}\` : '';
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

new_th = """  // Terminal in
  const handleTerminal = async (values: any) => {
    if (!selectedMawb) return;
    const returnedText = (values.terminalReturned || []).map((ri: any) => \`[Terminal Exception] \${ri.subMawb}: \${ri.reason}\`).join('\\n');
    try {
      await operationApi.updateMawb(selectedMawb.id, {
        status: 'terminal_in',
        remarks: [values.terminalRemark || '', returnedText].filter(Boolean).join('\\n'),
      });
      message.success(t('common.success'));
      setTerminalModalOpen(false);
      fetchData();
    } catch {
      message.error(t('common.error'));
    }
  };"""

if old_th in ml:
    ml = ml.replace(old_th, new_th, 1)
    print('Terminal handler updated')
else:
    print('Terminal handler: pattern not found')

# 6. Update MAWB drawer exception section to check for all exception keywords
old_exc_drawer = """            {selectedMawb.remarks && selectedMawb.remarks.includes('Exception') && (
              <div className="p-3 border rounded bg-red-50 border-red-200">
                <Text type="danger" className="text-xs block mb-1 font-bold flex items-center gap-1">! {t('operation.exception')}</Text>
                <div className="text-xs text-red-700">{selectedMawb.remarks.split('\\n').filter((l: string) => l.includes('Exception')).map((l: string, i: number) => <div key={i}>{l}</div>)}</div>
              </div>
            )}"""

new_exc_drawer = """            {selectedMawb.remarks && (selectedMawb.remarks.includes('Exception') || selectedMawb.remarks.includes('[Returned]')) && (
              <div className="p-3 border rounded bg-red-50 border-red-200">
                <Text type="danger" className="text-xs block mb-1 font-bold flex items-center gap-1">! {t('operation.exception')}</Text>
                <div className="text-xs text-red-700">{selectedMawb.remarks.split('\\n').filter((l: string) => l.includes('Exception') || l.includes('[Returned]')).map((l: string, i: number) => <div key={i}>{l}</div>)}</div>
              </div>
            )}"""

if old_exc_drawer in ml:
    ml = ml.replace(old_exc_drawer, new_exc_drawer, 1)
    print('MAWB drawer exception updated')
else:
    print('MAWB drawer exception: not found')

with open('src/modules/Operation/MawbList.tsx', 'w', encoding='utf-8') as f:
    f.write(ml)
print('MawbList.tsx done')

# ====== BookingList.tsx ======
with open('src/modules/Business/BookingList.tsx', 'r', encoding='utf-8') as f:
    bl = f.read()

# 7. Fix exception detection: also check for [Returned]
bl = bl.replace(
    "const hasException = mawbA?.remarks?.includes('Exception');",
    "const hasException = mawbA?.remarks?.includes('Exception') || mawbA?.remarks?.includes('[Returned]');"
)
print('BookingList exception detection fixed')

# 8. Fix drawer exception section to also check for [Returned]
bl = bl.replace(
    "if (!mawbX?.remarks || !mawbX.remarks.includes('Exception')) return null;",
    "if (!mawbX?.remarks || (!mawbX.remarks.includes('Exception') && !mawbX.remarks.includes('[Returned]'))) return null;"
)
bl = bl.replace(
    "mawbX.remarks.split('\\\\n').filter((l) => l.includes('Exception')).join('\\\\n')",
    "mawbX.remarks.split('\\\\n').filter((l) => l.includes('Exception') || l.includes('[Returned]')).join('\\\\n')"
)
print('BookingList drawer exception fixed')

# 9. Fix route in BookingList drawer: merge flight date into route line
old_route = """                <Col span={12}><Text type="secondary">Route:</Text> <div className="font-bold">{selectedBookingDetail.origin} → {selectedBookingDetail.destination}</div></Col>
                <Col span={12}><Text type="secondary">Flight:</Text> <div className="font-bold font-mono">{selectedBookingDetail.flightDate ? dayjs(selectedBookingDetail.flightDate).format('YYYY-MM-DD') : '--'} / {selectedBookingDetail.carrier || '--'}</div></Col>
                <Col span={12}><Text type="secondary">MAWB:</Text> <span className="font-mono text-blue-600">{selectedBookingDetail.mawbNo || '--'}</span></Col>"""

new_route = """                <Col span={12}><Text type="secondary">Route:</Text> <div className="flex flex-col"><span className="font-bold">{selectedBookingDetail.origin} → {selectedBookingDetail.destination}</span><span className="text-[10px] text-slate-400">{selectedBookingDetail.flightDate ? dayjs(selectedBookingDetail.flightDate).format('YYYY-MM-DD') : '--'} / {selectedBookingDetail.carrier || '--'}</span></div></Col>
                <Col span={12}><Text type="secondary">MAWB:</Text> <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-bold">{t('operation.mawbRef')||'MAWB'}</span><span className="font-mono text-blue-600">{selectedBookingDetail.mawbNo || '--'}</span></div></Col>"""

if old_route in bl:
    bl = bl.replace(old_route, new_route, 1)
    print('BookingList drawer route fixed')
else:
    print('BookingList drawer route: not found')

with open('src/modules/Business/BookingList.tsx', 'w', encoding='utf-8') as f:
    f.write(bl)
print('BookingList.tsx done')

# ====== MawbList.tsx drawer ======
# Also fix the operation center booking drawer to show route flight date under route tag
with open('src/modules/Operation/MawbList.tsx', 'r', encoding='utf-8') as f:
    ml2 = f.read()

old_drawer_route = """                <Col span={12}><Text type="secondary">Route:</Text> <div className="font-bold">{detailBooking.origin} → {detailBooking.destination}</div></Col>
                <Col span={12}><Text type="secondary">Flight:</Text> <div className="font-bold font-mono">{detailBooking.flightDate ? dayjs(detailBooking.flightDate).format('YYYY-MM-DD') : '--'} / {detailBooking.carrier || '--'}</div></Col>
                <Col span={12}><Text type="secondary">MAWB:</Text> <span className="font-mono text-blue-600">{detailBooking.mawbNo || '--'}</span></Col>"""

new_drawer_route = """                <Col span={12}><Text type="secondary">Route:</Text> <div className="flex flex-col"><span className="font-bold">{detailBooking.origin} → {detailBooking.destination}</span><span className="text-[10px] text-slate-400">{detailBooking.flightDate ? dayjs(detailBooking.flightDate).format('YYYY-MM-DD') : '--'} / {detailBooking.carrier || '--'}</span></div></Col>
                <Col span={12}><Text type="secondary">MAWB:</Text> <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-bold">{t('operation.mawbRef')||'MAWB'}</span><span className="font-mono text-blue-600">{detailBooking.mawbNo || '--'}</span></div></Col>"""

if old_drawer_route in ml2:
    ml2 = ml2.replace(old_drawer_route, new_drawer_route, 1)
    print('MawbList drawer route fixed')
else:
    print('MawbList drawer route: not found')

with open('src/modules/Operation/MawbList.tsx', 'w', encoding='utf-8') as f:
    f.write(ml2)

print('All done')

import os
os.chdir(os.path.dirname(__file__) + "/..")

NL = "\n"

with open('src/modules/Operation/MawbList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. Warehouse handler: add returnedText
old = '    if (!selectedMawb) return;' + NL + '    try {' + NL + "      await operationApi.updateMawb(selectedMawb.id, {" + NL + "        status: 'warehouse_in',"
new = '    if (!selectedMawb) return;' + NL + "    const returnedText = (values.returnedItems || []).map((ri: any) => `[Returned] ${ri.subMawb}: ${ri.reason}`).join('\\n');" + NL + '    try {' + NL + "      await operationApi.updateMawb(selectedMawb.id, {" + NL + "        status: 'warehouse_in',"
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print('1. Warehouse handler: add returnedText')

# 2. Warehouse remarks line
old = "        remarks: values.remarks || '',"
new = "        remarks: [values.remarks || '', returnedText].filter(Boolean).join('\\n'),"
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print('2. Warehouse remarks line')

# 3. Customs handler: change to customsReturned
old = "    const exc = values.customsException ? `[Customs Exception] ${values.customsException}` : '';"
new = "    const returnedText = (values.customsReturned || []).map((ri: any) => `[Customs Exception] ${ri.subMawb}: ${ri.reason}`).join('\\n');"
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print('3. Customs handler')

old = "        remarks: [values.customsRemark || '', exc].filter(Boolean).join('\\n'),"
new = "        remarks: [values.customsRemark || '', returnedText].filter(Boolean).join('\\n'),"
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print('4. Customs remarks')

# 4. Terminal handler: change to terminalReturned
old = "    const exc = values.terminalException ? `[Terminal Exception] ${values.terminalException}` : '';"
new = "    const returnedText = (values.terminalReturned || []).map((ri: any) => `[Terminal Exception] ${ri.subMawb}: ${ri.reason}`).join('\\n');"
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print('5. Terminal handler')

old = "        remarks: [values.terminalRemark || '', exc].filter(Boolean).join('\\n'),"
new = "        remarks: [values.terminalRemark || '', returnedText].filter(Boolean).join('\\n'),"
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print('6. Terminal remarks')

# 5. Customs modal: change to Form.List
old = '          <Form.Item name="customsException" label="Exception Details"><Input.TextArea rows={3} placeholder="Any delays or issues?" /></Form.Item>' + NL + '        </Form>' + NL + '      </Modal>'
new = '          <Form.List name="customsReturned">' + NL + '            {(fields, { add, remove }) => (' + NL + '              <>' + NL + '                {fields.map(({ key, name, ...restField }) => (' + NL + '                  <Card key={key} size="small" className="mb-2 bg-red-50">' + NL + '                    <Row gutter={8}>' + NL + "                      <Col span={12}><Form.Item {...restField} name={[name, 'subMawb']} label=\"Sub-ID\" rules={[{ required: true }]}><Input /></Form.Item></Col>" + NL + "                      <Col span={12}><Form.Item {...restField} name={[name, 'reason']} label={t('operation.reason')} rules={[{ required: true }]}><Input /></Form.Item></Col>" + NL + '                    </Row>' + NL + "                    <Button size=\"small\" danger onClick={() => remove(name)}>{t('common.delete')}</Button>" + NL + '                  </Card>' + NL + '                ))}' + NL + "                <Button type=\"link\" onClick={() => add()} icon={<Info size={14} />}>{t('operation.returnedItems')}</Button>" + NL + '              </>' + NL + '            )}' + NL + '          </Form.List>' + NL + '        </Form>' + NL + '      </Modal>'
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print('7. Customs modal')

# 6. Terminal modal: change to Form.List
old = '          <Form.Item name="terminalException" label="Exception Details"><Input.TextArea rows={3} placeholder="Any damages or issues at security?" /></Form.Item>' + NL + '        </Form>' + NL + '      </Modal>'
new = '          <Form.List name="terminalReturned">' + NL + '            {(fields, { add, remove }) => (' + NL + '              <>' + NL + '                {fields.map(({ key, name, ...restField }) => (' + NL + '                  <Card key={key} size="small" className="mb-2 bg-red-50">' + NL + '                    <Row gutter={8}>' + NL + "                      <Col span={12}><Form.Item {...restField} name={[name, 'subMawb']} label=\"Sub-ID\" rules={[{ required: true }]}><Input /></Form.Item></Col>" + NL + "                      <Col span={12}><Form.Item {...restField} name={[name, 'reason']} label={t('operation.reason')} rules={[{ required: true }]}><Input /></Form.Item></Col>" + NL + '                    </Row>' + NL + "                    <Button size=\"small\" danger onClick={() => remove(name)}>{t('common.delete')}</Button>" + NL + '                  </Card>' + NL + '                ))}' + NL + "                <Button type=\"link\" onClick={() => add()} icon={<Info size={14} />}>{t('operation.returnedItems')}</Button>" + NL + '              </>' + NL + '            )}' + NL + '          </Form.List>' + NL + '        </Form>' + NL + '      </Modal>'
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print('8. Terminal modal')

# 7. MAWB drawer exception: also check [Returned]
old = "selectedMawb.remarks && selectedMawb.remarks.includes('Exception')"
new = "selectedMawb.remarks && (selectedMawb.remarks.includes('Exception') || selectedMawb.remarks.includes('[Returned]'))"
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print('9. MAWB drawer exception check')

old = "l.includes('Exception')).map((l: string, i: number)"
new = "l.includes('Exception') || l.includes('[Returned]')).map((l: string, i: number)"
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print('10. MAWB drawer exception filter')

# 8. Booking drawer route fix
old = '<Col span={12}><Text type="secondary">Route:</Text> <div className="font-bold">{detailBooking.origin} → {detailBooking.destination}</div></Col>' + NL + '                <Col span={12}><Text type="secondary">Flight:</Text> <div className="font-bold font-mono">{detailBooking.flightDate ? dayjs(detailBooking.flightDate).format(\'YYYY-MM-DD\') : \'--\'} / {detailBooking.carrier || \'--\'}</div></Col>' + NL + '                <Col span={12}><Text type="secondary">MAWB:</Text> <span className="font-mono text-blue-600">{detailBooking.mawbNo || \'--\'}</span></Col>'
new = '<Col span={12}><Text type="secondary">Route:</Text> <div className="flex flex-col"><span className="font-bold">{detailBooking.origin} → {detailBooking.destination}</span><span className="text-[10px] text-slate-400">{detailBooking.flightDate ? dayjs(detailBooking.flightDate).format(\'YYYY-MM-DD\') : \'--\'} / {detailBooking.carrier || \'--\'}</span></div></Col>' + NL + '                <Col span={12}><Text type="secondary">MAWB:</Text> <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-bold">{t(\'operation.mawbRef\')||\'MAWB\'}</span><span className="font-mono text-blue-600">{detailBooking.mawbNo || \'--\'}</span></div></Col>'
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print('11. Booking drawer route')

with open('src/modules/Operation/MawbList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Also fix BookingList
with open('src/modules/Business/BookingList.tsx', 'r', encoding='utf-8') as f:
    bl = f.read()

old = "const hasException = mawbA?.remarks?.includes('Exception');"
new = "const hasException = mawbA?.remarks?.includes('Exception') || mawbA?.remarks?.includes('[Returned]');"
if old in bl:
    bl = bl.replace(old, new, 1)
    changes += 1
    print('12. BookingList exception detection')

old = "if (!mawbX?.remarks || !mawbX.remarks.includes('Exception')) return null;"
new = "if (!mawbX?.remarks || (!mawbX.remarks.includes('Exception') && !mawbX.remarks.includes('[Returned]'))) return null;"
if old in bl:
    bl = bl.replace(old, new, 1)
    changes += 1
    print('13. BookingList drawer exception check')

old = "mawbX.remarks.split('\\\\n').filter((l) => l.includes('Exception')).join('\\\\n')"
new = "mawbX.remarks.split('\\\\n').filter((l) => l.includes('Exception') || l.includes('[Returned]')).join('\\\\n')"
if old in bl:
    bl = bl.replace(old, new, 1)
    changes += 1
    print('14. BookingList drawer exception filter')

# Fix BookingList drawer route
old = '<Col span={12}><Text type="secondary">Route:</Text> <div className="font-bold">{selectedBookingDetail.origin} → {selectedBookingDetail.destination}</div></Col>' + NL + '                <Col span={12}><Text type="secondary">Flight:</Text> <div className="font-bold font-mono">{selectedBookingDetail.flightDate ? dayjs(selectedBookingDetail.flightDate).format(\'YYYY-MM-DD\') : \'--\'} / {selectedBookingDetail.carrier || \'--\'}</div></Col>' + NL + '                <Col span={12}><Text type="secondary">MAWB:</Text> <span className="font-mono text-blue-600">{selectedBookingDetail.mawbNo || \'--\'}</span></Col>'
new = '<Col span={12}><Text type="secondary">Route:</Text> <div className="flex flex-col"><span className="font-bold">{selectedBookingDetail.origin} → {selectedBookingDetail.destination}</span><span className="text-[10px] text-slate-400">{selectedBookingDetail.flightDate ? dayjs(selectedBookingDetail.flightDate).format(\'YYYY-MM-DD\') : \'--\'} / {selectedBookingDetail.carrier || \'--\'}</span></div></Col>' + NL + '                <Col span={12}><Text type="secondary">MAWB:</Text> <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-bold">{t(\'operation.mawbRef\')||\'MAWB\'}</span><span className="font-mono text-blue-600">{selectedBookingDetail.mawbNo || \'--\'}</span></div></Col>'
if old in bl:
    bl = bl.replace(old, new, 1)
    changes += 1
    print('15. BookingList drawer route')

with open('src/modules/Business/BookingList.tsx', 'w', encoding='utf-8') as f:
    f.write(bl)

print(f'\\nAll done: {changes} changes applied')

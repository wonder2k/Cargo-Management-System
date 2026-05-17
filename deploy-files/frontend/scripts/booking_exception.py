import os
os.chdir(os.path.dirname(__file__) + "/..")

with open('src/modules/Business/BookingList.tsx', 'r', encoding='utf-8') as f:
    bl = f.read()

# 1. Add AlertCircle import
bl = bl.replace(
    "PlaneTakeoff, PlaneLanding }",
    "PlaneTakeoff, PlaneLanding, AlertCircle }"
)
print('AlertCircle import added')

# 2. Add Alert to antd import
bl = bl.replace(
    "Badge, Upload, Tooltip }",
    "Badge, Upload, Tooltip, Alert }"
)
print('Alert import added')

# 3. Add exception Alert in drawer before Docs section
old_docs = '            <Divider orientation="left">{t(' + "'operation.docs')" + " || 'Docs'}</Divider>"

new_docs = """            <div id="booking-exceptions">
              {(() => {
                const mawbX = mawbs.find(m => m.mawbNo === selectedBookingDetail.mawbNo);
                if (!mawbX?.remarks || !mawbX.remarks.includes('Exception')) return null;
                return (
                  <div className="mb-4">
                    <Alert type="error" showIcon message={t('operation.exception')} description={mawbX.remarks.split('\\n').filter((l) => l.includes('Exception')).join('\\n')} />
                  </div>
                );
              })()}
            </div>
            <Divider orientation="left">{t('operation.docs') || 'Docs'}</Divider>"""

if old_docs in bl:
    bl = bl.replace(old_docs, new_docs, 1)
    print('Drawer exception section added')
else:
    print('Drawer exception: pattern not found')

# 4. Add exception icon to actions
old_actions = """              render: (r: Booking) => (
                <Space>
                  {(r.status === 'pre_booked' || r.status === 'space_confirmed') && (
                    <Button type="primary" size="small" ghost onClick={() => { setSelectedBooking(r); setActionModalOpen(true); }}>{t('common.submit')}</Button>
                  )}
                  {r.status === 'finalized' && (
                    <Button size="small" icon={<Printer size={14} style={{ color: '#3b82f6' }} />} onClick={() => { const wh = (profile as any)?.warehouses?.find((w: any) => w.id === r.warehouseId); PDFService.generateBookingOrder(r, wh, profile); }} />
                  )}
                </Space>"""

new_actions = """              render: (r: Booking) => {
                const mawbA = mawbs.find(m => m.mawbNo === r.mawbNo);
                const hasException = mawbA?.remarks?.includes('Exception');
                return (
                <Space>
                  {hasException && (
                    <Button size="small" danger icon={<AlertCircle size={14} />} onClick={() => { setSelectedBookingDetail(r); setDetailDrawerOpen(true); }} />
                  )}
                  {(r.status === 'pre_booked' || r.status === 'space_confirmed') && (
                    <Button type="primary" size="small" ghost onClick={() => { setSelectedBooking(r); setActionModalOpen(true); }}>{t('common.submit')}</Button>
                  )}
                  {r.status === 'finalized' && (
                    <Button size="small" icon={<Printer size={14} style={{ color: '#3b82f6' }} />} onClick={() => { const wh = (profile as any)?.warehouses?.find((w: any) => w.id === r.warehouseId); PDFService.generateBookingOrder(r, wh, profile); }} />
                  )}
                </Space>"""

if old_actions in bl:
    bl = bl.replace(old_actions, new_actions, 1)
    print('Actions column updated')
else:
    print('Actions column: pattern not found')

with open('src/modules/Business/BookingList.tsx', 'w', encoding='utf-8') as f:
    f.write(bl)
print('Done')

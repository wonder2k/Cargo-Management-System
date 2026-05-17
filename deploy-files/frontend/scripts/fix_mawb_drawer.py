import os
os.chdir(os.path.dirname(__file__) + "/..")

NL = "\n"

with open('src/modules/Operation/MawbList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Drawer title
old_title = "title={`${t('operation.mawbRef')}: ${selectedMawb?.mawbNo}`}"
new_title = 'title={<Space><FileText size={18} className="text-blue-600" /> <span className="font-mono">{selectedMawb?.mawbNo}</span></Space>}'
content = content.replace(old_title, new_title, 1)

# Fix 2: Replace card + stats section
old_card = '''            <Card size="small" className="bg-slate-50">
              <Row gutter={[16, 16]}>
                <Col span={12}><Text type="secondary">Origin:</Text> <div className="font-bold">{selectedMawb.origin}</div></Col>
                <Col span={12}><Text type="secondary">Destination:</Text> <div className="font-bold">{selectedMawb.destination}</div></Col>
                <Col span={12}><Text type="secondary">Carrier:</Text> <div className="font-bold">{selectedMawb.carrier}</div></Col>
                <Col span={12}><Text type="secondary">{t('common.status')}:</Text> <Tag>{t(MAWB_STATUSES.find(s => s.value === selectedMawb.status)?.labelKey || selectedMawb.status)}</Tag></Col>
              </Row>
            </Card>
            <Divider />
            <Row gutter={[16, 16]}>
              <Col span={12}><Statistic title="Weight" value={selectedMawb.weight || 0} suffix="KG" /></Col>
              <Col span={12}><Statistic title="Chargeable" value={selectedMawb.chargeableWeight || 0} suffix="KG" /></Col>
            </Row>'''

new_card = '''            {(() => {
              const booking = allBookings.find(b => b.mawbNo === selectedMawb.mawbNo);
              return (
                <Card size="small" className="bg-slate-50">
                  <Row gutter={[16, 16]}>
                    <Col span={12}><Text type="secondary">{t('common.bookingNo')}:</Text> <div className="font-bold text-blue-600">{booking?.bookingNo || '--'}</div></Col>
                    <Col span={12}><Text type="secondary">{t('common.status')}:</Text> <Tag>{t(MAWB_STATUSES.find(s => s.value === selectedMawb.status)?.labelKey || selectedMawb.status)}</Tag></Col>
                    <Col span={12}><Text type="secondary">Route:</Text> <div className="flex flex-col"><span className="font-bold">{selectedMawb.origin} → {selectedMawb.destination}</span><span className="text-[10px] text-slate-400">{selectedMawb.flightDate ? dayjs(selectedMawb.flightDate).format('YYYY-MM-DD') : '--'} / {selectedMawb.carrier || '--'}</span></div></Col>
                    <Col span={12}><Text type="secondary">Customer:</Text> <div className="font-bold">{booking ? (customers.find(c => c.id === booking.customerId)?.name || booking.customerName) : '--'}</div></Col>
                    <Col span={12}><Text type="secondary">{t('common.user')}:</Text> <div className="font-bold text-indigo-600">{(profile as any)?.contactPerson || (profile as any)?.name || '--'}</div></Col>
                    <Col span={12}><Text type="secondary">{t('common.phone')}:</Text> <div className="font-bold text-indigo-600">{(profile as any)?.contactPhone || '--'}</div></Col>
                  </Row>
                </Card>
              );
            })()}
            <Divider orientation="left">{t('common.cargo') || 'Cargo'}</Divider>
            <Row gutter={[16, 16]}>
              <Col span={8}><Statistic title="Pieces" value={selectedMawb.pieces || 0} /></Col>
              <Col span={8}><Statistic title="Weight" value={selectedMawb.weight || 0} suffix="KG" /></Col>
              <Col span={8}><Statistic title="Volume" value={selectedMawb.volume || 0} suffix="CBM" /></Col>
            </Row>'''

if old_card in content:
    content = content.replace(old_card, new_card, 1)
    print('MAWB drawer card updated')
else:
    print('MAWB drawer card: pattern not found')

with open('src/modules/Operation/MawbList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')

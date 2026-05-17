import os
os.chdir(os.path.dirname(__file__) + "/..")

# ====== MawbList.tsx changes ======
with open('src/modules/Operation/MawbList.tsx', 'r', encoding='utf-8') as f:
    ml = f.read()

# 1. Gap gap-3 -> gap-6 in finishedCols (first occurrence in the docs column section)
ml = ml.replace(
    'flex items-center gap-3\">\n              <Button size=\"small\"\n                icon={<Package size={14}',
    'flex items-center gap-6\">\n              <Button size=\"small\"\n                icon={<Package size={14}'
)

# 2. finishedCols draft icon orange -> blue
ml = ml.replace(
    'icon={<FileText size={14} style={{ color: \'#f97316\' }} />}\n                onClick={() => triggerDownload(mawb.draftFileUrl!)}>\n                {t(\'operation.steps.draft\')||\'Draft\'}\n              </Button>\n            )}\n          </div>',
    'icon={<FileText size={14} style={{ color: \'#3b82f6\' }} />}\n                onClick={() => triggerDownload(mawb.draftFileUrl!)}>\n                {t(\'operation.steps.draft\')||\'Draft\'}\n              </Button>\n            )}\n          </div>'
)

# 3. Booking drawer draft icon orange -> blue
ml = ml.replace(
    'style={{color:\'#f97316\'}} /> <Text className=\"font-medium\">{t(\'operation.steps.draft\')||\'Draft\'}</Text>',
    'style={{color:\'#3b82f6\'}} /> <Text className=\"font-medium\">{t(\'operation.steps.draft\')||\'Draft\'}</Text>'
)

# 4. Hide draft upload button when draftFileUrl exists
ml = ml.replace(
    '{(r.status === \'warehouse_in\' || r.status === \'customs\') && (\n              <Tooltip title={t(\'common.upload\')+\' Draft MAWB\'}>',
    '{(r.status === \'warehouse_in\' || r.status === \'customs\') && !r.draftFileUrl && (\n              <Tooltip title={t(\'common.upload\')+\' Draft MAWB\'}>'
)

# 5. Enhance booking drawer - add salesperson info
# The user profile has contactPerson and contactPhone
old_drawer_card = """            <Card size="small" className="bg-slate-50">
              <Row gutter={[16, 16]}>
                <Col span={12}><Text type="secondary">Customer:</Text> <div className="font-bold">{detailBooking.customerName}</div></Col>
                <Col span={12}><Text type="secondary">{t('common.status')}:</Text> <Tag>{t(`booking.status.${detailBooking.status}`)}</Tag></Col>
                <Col span={12}><Text type="secondary">Route:</Text> <div className="font-bold">{detailBooking.origin} → {detailBooking.destination}</div></Col>
                <Col span={12}><Text type="secondary">MAWB:</Text> <span className="font-mono text-blue-600">{detailBooking.mawbNo || '--'}</span></Col>
              </Row>
            </Card>"""

new_drawer_card = """            <Card size="small" className="bg-slate-50">
              <Row gutter={[16, 16]}>
                <Col span={12}><Text type="secondary">Customer:</Text> <div className="font-bold">{detailBooking.customerName}</div></Col>
                <Col span={12}><Text type="secondary">{t('common.status')}:</Text> <Tag>{t(`booking.status.${detailBooking.status}`)}</Tag></Col>
                <Col span={12}><Text type="secondary">Route:</Text> <div className="font-bold">{detailBooking.origin} → {detailBooking.destination}</div></Col>
                <Col span={12}><Text type="secondary">Flight:</Text> <div className="font-bold font-mono">{detailBooking.flightDate ? dayjs(detailBooking.flightDate).format('YYYY-MM-DD') : '--'} / {detailBooking.carrier || '--'}</div></Col>
                <Col span={12}><Text type="secondary">MAWB:</Text> <span className="font-mono text-blue-600">{detailBooking.mawbNo || '--'}</span></Col>
                <Col span={12}><Text type="secondary">{t('bookings.subtitle')}:</Text> <div className="font-bold text-indigo-600">{(profile as any)?.contactPerson || (profile as any)?.name || '--'}</div></Col>
                <Col span={12}><Text type="secondary">{t('common.phone')}:</Text> <div className="font-bold text-indigo-600">{(profile as any)?.contactPhone || '--'}</div></Col>
              </Row>
            </Card>"""

if old_drawer_card in ml:
    ml = ml.replace(old_drawer_card, new_drawer_card, 1)
    print('Drawer card updated with salesperson info')
else:
    print('Drawer card: pattern not found')
    idx = ml.find('Card size=\"small\" className=\"bg-slate-50\"')
    if idx >= 0:
        # Find the SECOND occurrence (booking drawer, not MAWB drawer)
        idx2 = ml.find('Card size=\"small\" className=\"bg-slate-50\"', idx + 50)
        if idx2 >= 0:
            print(ml[idx2:idx2+600])

with open('src/modules/Operation/MawbList.tsx', 'w', encoding='utf-8') as f:
    f.write(ml)
print('MawbList.tsx done')

# ====== BookingList.tsx changes ======
with open('src/modules/Business/BookingList.tsx', 'r', encoding='utf-8') as f:
    bl = f.read()

# 6. BookingList draft icon orange -> blue
bl = bl.replace(
    'icon={<FileText size={14} style={{ color: \'#f97316\' }} />}',
    'icon={<FileText size={14} style={{ color: \'#3b82f6\' }} />}'
)

with open('src/modules/Business/BookingList.tsx', 'w', encoding='utf-8') as f:
    f.write(bl)
print('BookingList.tsx done')
print('All changes complete')

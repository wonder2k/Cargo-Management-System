import os
os.chdir(os.path.dirname(__file__) + "/..")

with open('src/modules/Business/BookingList.tsx', 'r', encoding='utf-8') as f:
    bl = f.read()

old_drawer = """      <Drawer title={<span className="font-mono">{selectedBookingDetail?.bookingNo}</span>}
        open={detailDrawerOpen} onClose={() => setDetailDrawerOpen(false)} width={450}>
        {selectedBookingDetail && (
          <div className="space-y-4">
            <Card size="small" className="bg-slate-50">
              <Row gutter={[16, 16]}>
                <Col span={24}><Text type="secondary">Customer:</Text> <div className="font-bold">{selectedBookingDetail.customerName}</div></Col>
                <Col span={12}><Text type="secondary">Route:</Text> <div className="font-bold">{selectedBookingDetail.origin} → {selectedBookingDetail.destination}</div></Col>
                <Col span={12}><Text type="secondary">Carrier:</Text> <div className="font-bold font-mono">{selectedBookingDetail.carrier}</div></Col>
              </Row>
            </Card>
            <Divider />
            <Row gutter={[16, 16]}>
              <Col span={8}><Statistic title="Pieces" value={selectedBookingDetail.pieces} /></Col>
              <Col span={8}><Statistic title="Weight" value={selectedBookingDetail.weight} suffix="KG" /></Col>
              <Col span={8}><Statistic title="Volume" value={selectedBookingDetail.volume} suffix="CBM" /></Col>
            </Row>
            <Divider orientation="left">{t('operation.docs')||'Docs'}</Divider>
            {selectedBookingDetail.manifestFileUrl ? (
              <div className="flex items-center justify-between p-3 border rounded hover:bg-slate-50 cursor-pointer" onClick={() => triggerDownload(selectedBookingDetail.manifestFileUrl!)}>
                <Space><Package size={18} className="text-blue-500" /> <Text className="font-medium">{t('operation.manifest')||'Manifest'}</Text></Space>
                <Button type="link" icon={<ExternalLink size={14} />}>{t('common.download')||'Download'}</Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border rounded">
                <Space><Package size={18} className="text-slate-300" /> <Text className="font-medium text-slate-400">{t('operation.manifest')||'Manifest'}</Text></Space>
                <Text type="secondary" className="text-xs">{t('common.noData')||'Not uploaded'}</Text>
              </div>
            )}
          </div>
        )}
      </Drawer>"""

new_drawer = """      <Drawer title={<Space><FileText size={18} className="text-blue-600" /> <span className="font-mono">{selectedBookingDetail?.bookingNo}</span></Space>}
        open={detailDrawerOpen} onClose={() => setDetailDrawerOpen(false)} width={500}>
        {selectedBookingDetail && (
          <div className="space-y-6">
            <Card size="small" className="bg-slate-50">
              <Row gutter={[16, 16]}>
                <Col span={12}><Text type="secondary">Customer:</Text> <div className="font-bold">{selectedBookingDetail.customerName}</div></Col>
                <Col span={12}><Text type="secondary">{t('common.status')}:</Text> <Tag>{t(`booking.status.${selectedBookingDetail.status}`)}</Tag></Col>
                <Col span={12}><Text type="secondary">Route:</Text> <div className="font-bold">{selectedBookingDetail.origin} → {selectedBookingDetail.destination}</div></Col>
                <Col span={12}><Text type="secondary">Flight:</Text> <div className="font-bold font-mono">{selectedBookingDetail.flightDate ? dayjs(selectedBookingDetail.flightDate).format('YYYY-MM-DD') : '--'} / {selectedBookingDetail.carrier || '--'}</div></Col>
                <Col span={12}><Text type="secondary">MAWB:</Text> <span className="font-mono text-blue-600">{selectedBookingDetail.mawbNo || '--'}</span></Col>
                <Col span={12}><Text type="secondary">{t('common.user')}:</Text> <div className="font-bold text-indigo-600">{(profile as any)?.contactPerson || (profile as any)?.name || '--'}</div></Col>
                <Col span={12}><Text type="secondary">{t('common.phone')}:</Text> <div className="font-bold text-indigo-600">{(profile as any)?.contactPhone || '--'}</div></Col>
              </Row>
            </Card>
            <Divider orientation="left">{t('common.cargo') || 'Cargo'}</Divider>
            <Row gutter={[16, 16]}>
              <Col span={8}><Statistic title="Pieces" value={selectedBookingDetail.pieces} /></Col>
              <Col span={8}><Statistic title="Weight" value={selectedBookingDetail.weight} suffix="KG" /></Col>
              <Col span={8}><Statistic title="Volume" value={selectedBookingDetail.volume} suffix="CBM" /></Col>
            </Row>
            <div className="p-3 border rounded bg-slate-50">
              <Text type="secondary" className="text-xs block mb-1 underline">{t('common.goodsDesc') || 'Goods'}</Text>
              <div className="text-sm">{selectedBookingDetail.goodsDescription}</div>
            </div>
            {selectedBookingDetail.shipperInfo && (
              <div>
                <Divider orientation="left">{t('common.shipperInfo') || 'Shipper'}</Divider>
                <div className="text-xs text-slate-600 bg-white p-2 border rounded whitespace-pre-wrap">{selectedBookingDetail.shipperInfo}</div>
              </div>
            )}
            {selectedBookingDetail.consigneeInfo && (
              <div>
                <Divider orientation="left">{t('common.consigneeInfo') || 'Consignee'}</Divider>
                <div className="text-xs text-slate-600 bg-white p-2 border rounded whitespace-pre-wrap">{selectedBookingDetail.consigneeInfo}</div>
              </div>
            )}
            <Divider orientation="left">{t('operation.docs') || 'Docs'}</Divider>
            <Space direction="vertical" className="w-full">
              {selectedBookingDetail.manifestFileUrl ? (
                <div className="flex items-center justify-between p-3 border rounded hover:bg-slate-50 cursor-pointer" onClick={() => triggerDownload(selectedBookingDetail.manifestFileUrl!)}>
                  <Space><Package size={18} style={{color:'#3b82f6'}} /> <Text className="font-medium">{t('operation.manifest')||'Manifest'}</Text></Space>
                  <Button type="link" icon={<ExternalLink size={14} />}>{t('common.download')||'Download'}</Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 border rounded">
                  <Space><Package size={18} className="text-slate-300" /> <Text className="font-medium text-slate-400">{t('operation.manifest')||'Manifest'}</Text></Space>
                  <Text type="secondary" className="text-xs">{t('common.noData')||'Not uploaded'}</Text>
                </div>
              )}
              {(() => {
                const mawb = mawbs.find(m => m.mawbNo === selectedBookingDetail.mawbNo);
                return mawb?.draftFileUrl ? (
                  <div className="flex items-center justify-between p-3 border rounded hover:bg-slate-50 cursor-pointer" onClick={() => triggerDownload(mawb.draftFileUrl!)}>
                    <Space><FileText size={18} style={{color:'#3b82f6'}} /> <Text className="font-medium">{t('operation.steps.draft')||'Draft'}</Text></Space>
                    <Button type="link" icon={<ExternalLink size={14} />}>{t('common.download')||'Download'}</Button>
                  </div>
                ) : null;
              })()}
            </Space>
          </div>
        )}
      </Drawer>"""

if old_drawer in bl:
    bl = bl.replace(old_drawer, new_drawer, 1)
    print('BookingList drawer updated')
else:
    print('BookingList drawer: pattern not found')
    idx = bl.find('selectedBookingDetail?.bookingNo')
    if idx >= 0: print(bl[idx:idx+600])

with open('src/modules/Business/BookingList.tsx', 'w', encoding='utf-8') as f:
    f.write(bl)
print('Done')

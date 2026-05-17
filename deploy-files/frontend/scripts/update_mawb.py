import os
os.chdir(os.path.dirname(__file__) + "/..")

with open('src/modules/Operation/MawbList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 0. Add PDFService import (after uploadApi import)
content = content.replace(
    "import { operationApi, businessApi, uploadApi } from '../../services/api';",
    "import { operationApi, businessApi, uploadApi } from '../../services/api';\nimport { PDFService } from '../../services/PDFService';"
)

# 1. Add Printer to lucide-react import
content = content.replace(
    "Activity, Info } from 'lucide-react'",
    "Activity, Info, Printer } from 'lucide-react'"
)

# 2. Update finishedCols
old_finished = """  // ==== Finished Bookings Columns ====
  const finishedCols = [
    {
      title: t('common.bookingNo') || 'Booking',
      render: (_: any, r: Booking) => (
        <span className="font-mono font-bold text-blue-600 cursor-pointer"
          onClick={() => { setDetailBooking(r); setDetailDrawerOpen(true); }}>
          {r.bookingNo}
        </span>
      ),
    },
    {
      title: 'MAWB',
      render: (_: any, r: Booking) => <span className="font-mono text-blue-500 font-bold">{r.mawbNo || '--'}</span>,
    },
    {
      title: t('common.customer'),
      render: (_: any, r: Booking) => customers.find(c => c.id === r.customerId)?.name || r.customerName || '--',
    },
    {
      title: RouteTitle,
      render: (_: any, r: Booking) => <Tag>{r.origin} → {r.destination}</Tag>,
    },
    {
      title: 'Flight',
      render: (_: any, r: Booking) => (
        <div className="text-xs">
          <div className="text-slate-700 font-bold">{r.carrier || '--'}</div>
          <div className="text-slate-400">{r.flightDate ? dayjs(r.flightDate).format('MM-DD') : '--'}</div>
        </div>
      ),
    },
    {
      title: t('common.status'),
      filters: MAWB_STATUSES.map(s => ({ text: t(s.labelKey), value: s.value })),
      onFilter: (value: any, r: Booking) => {
        const mawb = mawbs.find(m => m.mawbNo === r.mawbNo);
        const s = mawb?.status || r.status;
        return s === value;
      },
      render: (_: any, r: Booking) => {
        const mawb = mawbs.find(m => m.mawbNo === r.mawbNo);
        const s = mawb?.status || r.status;
        const config = MAWB_STATUSES.find(x => x.value === s);
        return <Tag color={config?.color}>{t(config?.labelKey || s)}</Tag>;
      },
    },
  ];"""

new_finished = """  // ==== Finished Bookings Columns ====
  const finishedCols = [
    {
      title: t('common.bookingNo') || 'Booking',
      render: (_: any, r: Booking) => (
        <div className="flex items-center gap-1">
          <span className="font-mono font-bold text-blue-600 cursor-pointer"
            onClick={() => { setDetailBooking(r); setDetailDrawerOpen(true); }}>
            {r.bookingNo}
          </span>
          <span className="font-mono text-blue-500 font-bold text-[10px]">{r.mawbNo || '--'}</span>
          {r.status === 'finalized' && (
            <Printer size={12} className="text-blue-500 cursor-pointer" onClick={() => { const wh = (profile as any)?.warehouses?.find((w: any) => w.id === r.warehouseId); PDFService.generateBookingOrder(r, wh, profile); }} />
          )}
        </div>
      ),
    },
    {
      title: t('common.customer'),
      render: (_: any, r: Booking) => customers.find(c => c.id === r.customerId)?.name || r.customerName || '--',
    },
    {
      title: RouteTitle,
      render: (_: any, r: Booking) => <Tag color="geekblue">{r.origin} → {r.destination}</Tag>,
    },
    {
      title: 'Flight',
      render: (_: any, r: Booking) => (
        <div className="text-xs">
          <div className="text-slate-700 font-bold">{r.carrier || '--'}</div>
          <div className="text-slate-400">{r.flightDate ? dayjs(r.flightDate).format('MM-DD') : '--'}</div>
        </div>
      ),
    },
    {
      title: t('common.cargo') || 'Cargo',
      render: (_: any, r: Booking) => (
        <div className="text-xs">
          {r.pieces}P / {r.weight}K / {r.volume}C
          <div className="text-slate-400 truncate w-28">{r.goodsDescription}</div>
        </div>
      ),
    },
    {
      title: t('operation.docs') || 'Docs',
      render: (_: any, r: Booking) => (
        <Button size="small"
          icon={<Package size={14} style={{ color: r.manifestFileUrl ? '#3b82f6' : '#f97316' }} />}
          onClick={() => {
            if (r.manifestFileUrl) triggerDownload(r.manifestFileUrl);
            else { setManifestTarget(r); setManifestModalOpen(true); }
          }}>
          {t('operation.manifest')||'Manifest'}
        </Button>
      ),
    },
    {
      title: t('common.status'),
      filters: MAWB_STATUSES.map(s => ({ text: t(s.labelKey), value: s.value })),
      onFilter: (value: any, r: Booking) => {
        const mawb = mawbs.find(m => m.mawbNo === r.mawbNo);
        const s = mawb?.status || r.status;
        return s === value;
      },
      render: (_: any, r: Booking) => {
        const mawb = mawbs.find(m => m.mawbNo === r.mawbNo);
        const s = mawb?.status || r.status;
        const config = MAWB_STATUSES.find(x => x.value === s);
        return <Tag color={config?.color}>{t(config?.labelKey || s)}</Tag>;
      },
    },
  ];"""

if old_finished in content:
    content = content.replace(old_finished, new_finished, 1)
    print('finishedCols updated')
else:
    print('finishedCols: pattern not found')
    idx = content.find('Finished Bookings Columns')
    if idx >= 0: print(content[idx:idx+1200])

# 3. Enhance the booking detail drawer
old_drawer = """      {/* Booking Detail Drawer */}
      <Drawer title={`Booking: ${detailBooking?.bookingNo}`}
        open={detailDrawerOpen} onClose={() => setDetailDrawerOpen(false)} width={450}>
        {detailBooking && (
          <div className="space-y-4">
            <Card size="small" className="bg-slate-50">
              <Row gutter={[16, 16]}>
                <Col span={12}><Text type="secondary">Customer:</Text> <div className="font-bold">{detailBooking.customerName}</div></Col>
                <Col span={12}><Text type="secondary">{t('common.status')}:</Text> <Tag>{t(`booking.status.${detailBooking.status}`)}</Tag></Col>
                <Col span={12}><Text type="secondary">Route:</Text> <div className="font-bold">{detailBooking.origin} → {detailBooking.destination}</div></Col>
                <Col span={12}><Text type="secondary">MAWB:</Text> <span className="font-mono text-blue-600">{detailBooking.mawbNo || '--'}</span></Col>
              </Row>
            </Card>
            <Divider />
            <Row gutter={[16, 16]}>
              <Col span={8}><Statistic title="Pieces" value={detailBooking.pieces} /></Col>
              <Col span={8}><Statistic title="Weight" value={detailBooking.weight} suffix="KG" /></Col>
              <Col span={8}><Statistic title="Volume" value={detailBooking.volume} suffix="CBM" /></Col>
            </Row>
            <div className="p-3 border rounded bg-slate-50">
              <Text type="secondary" className="text-xs block mb-1">Goods</Text>
              <div>{detailBooking.goodsDescription}</div>
            </div>
          </div>
        )}
      </Drawer>"""

new_drawer = """      {/* Booking Detail Drawer */}
      <Drawer title={<Space><FileText size={18} className="text-blue-600" /> <span className="font-mono">{detailBooking?.bookingNo}</span></Space>}
        open={detailDrawerOpen} onClose={() => setDetailDrawerOpen(false)} width={500}>
        {detailBooking && (
          <div className="space-y-6">
            <Card size="small" className="bg-slate-50">
              <Row gutter={[16, 16]}>
                <Col span={12}><Text type="secondary">Customer:</Text> <div className="font-bold">{detailBooking.customerName}</div></Col>
                <Col span={12}><Text type="secondary">{t('common.status')}:</Text> <Tag>{t(`booking.status.${detailBooking.status}`)}</Tag></Col>
                <Col span={12}><Text type="secondary">Route:</Text> <div className="font-bold">{detailBooking.origin} → {detailBooking.destination}</div></Col>
                <Col span={12}><Text type="secondary">MAWB:</Text> <span className="font-mono text-blue-600">{detailBooking.mawbNo || '--'}</span></Col>
              </Row>
            </Card>
            <Divider orientation="left">{t('common.cargo') || 'Cargo'}</Divider>
            <Row gutter={[16, 16]}>
              <Col span={8}><Statistic title="Pieces" value={detailBooking.pieces} /></Col>
              <Col span={8}><Statistic title="Weight" value={detailBooking.weight} suffix="KG" /></Col>
              <Col span={8}><Statistic title="Volume" value={detailBooking.volume} suffix="CBM" /></Col>
            </Row>
            <div className="p-3 border rounded bg-slate-50">
              <Text type="secondary" className="text-xs block mb-1 underline">{t('common.goodsDesc') || 'Goods'}</Text>
              <div className="text-sm">{detailBooking.goodsDescription}</div>
            </div>
            {detailBooking.shipperInfo && (
              <div>
                <Divider orientation="left">{t('common.shipperInfo') || 'Shipper'}</Divider>
                <div className="text-xs text-slate-600 bg-white p-2 border rounded whitespace-pre-wrap">{detailBooking.shipperInfo}</div>
              </div>
            )}
            {detailBooking.consigneeInfo && (
              <div>
                <Divider orientation="left">{t('common.consigneeInfo') || 'Consignee'}</Divider>
                <div className="text-xs text-slate-600 bg-white p-2 border rounded whitespace-pre-wrap">{detailBooking.consigneeInfo}</div>
              </div>
            )}
            <Divider orientation="left">{t('operation.docs') || 'Docs'}</Divider>
            <Space direction="vertical" className="w-full">
              {detailBooking.manifestFileUrl ? (
                <div className="flex items-center justify-between p-3 border rounded hover:bg-slate-50 cursor-pointer" onClick={() => triggerDownload(detailBooking.manifestFileUrl!)}>
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
                const mawb = mawbs.find(m => m.mawbNo === detailBooking.mawbNo);
                return mawb?.draftFileUrl ? (
                  <div className="flex items-center justify-between p-3 border rounded hover:bg-slate-50 cursor-pointer" onClick={() => triggerDownload(mawb.draftFileUrl!)}>
                    <Space><FileText size={18} style={{color:'#f97316'}} /> <Text className="font-medium">{t('operation.steps.draft')||'Draft'}</Text></Space>
                    <Button type="link" icon={<ExternalLink size={14} />}>{t('common.download')||'Download'}</Button>
                  </div>
                ) : null;
              })()}
            </Space>
          </div>
        )}
      </Drawer>"""

if old_drawer in content:
    content = content.replace(old_drawer, new_drawer, 1)
    print('Booking drawer updated')
else:
    print('Booking drawer: pattern not found')
    idx = content.find('Booking Detail Drawer')
    if idx >= 0: print(content[idx:idx+800])

with open('src/modules/Operation/MawbList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')

import os
os.chdir(os.path.dirname(__file__) + "/..")

with open('src/modules/Operation/MawbList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = """  // ==== Finished Bookings Columns ====
  const finishedCols = [
    {
      title: t('common.bookingNo') || 'Booking',
      render: (_: any, r: Booking) => (
        <div className="flex flex-col cursor-pointer" onClick={() => { setDetailBooking(r); setDetailDrawerOpen(true); }}>
          <span className="text-sm font-mono font-bold text-blue-600">{r.bookingNo}</span>
          <span className="text-[10px] text-blue-500 font-mono font-bold">{r.mawbNo || '--'}</span>
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
      render: (_: any, r: Booking) => {
        const mawb = mawbs.find(m => m.mawbNo === r.mawbNo);
        return (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-6">
              <Button size="small"
                icon={<Package size={14} style={{ color: r.manifestFileUrl ? '#3b82f6' : '#f97316' }} />}
                onClick={() => {
                  if (r.manifestFileUrl) triggerDownload(r.manifestFileUrl);
                  else { setManifestTarget(r); setManifestModalOpen(true); }
                }}>
                {t('operation.manifest')||'Manifest'}
              </Button>
              {r.status === 'finalized' && (
                <Printer size={14} className="text-blue-500 cursor-pointer" onClick={() => { const wh = (profile as any)?.warehouses?.find((w: any) => w.id === r.warehouseId); PDFService.generateBookingOrder(r, wh, profile); }} />
              )}
            </div>
            {mawb?.draftFileUrl && (
              <Button size="small"
                icon={<FileText size={14} style={{ color: '#3b82f6' }} />}
                onClick={() => triggerDownload(mawb.draftFileUrl!)}>
                {t('operation.steps.draft')||'Draft'}
              </Button>
            )}
          </div>
        );
      },
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

new = """  // ==== Finished Bookings Columns ====
  const finishedCols = [
    {
      title: t('common.bookingNo') || 'Booking',
      render: (_: any, r: Booking) => (
        <div className="flex items-center gap-2">
          <div className="flex flex-col cursor-pointer" onClick={() => { setDetailBooking(r); setDetailDrawerOpen(true); }}>
            <span className="text-sm font-mono font-bold text-blue-600">{r.bookingNo}</span>
            <span className="text-[10px] text-slate-500">{dayjs(r.createdAt).format('YYYY-MM-DD')}</span>
          </div>
          {r.mawbNo && (
            <Printer size={14} className="text-blue-500 cursor-pointer flex-shrink-0" onClick={(e) => { e.stopPropagation(); const wh = (profile as any)?.warehouses?.find((w: any) => w.id === r.warehouseId); PDFService.generateBookingOrder(r, wh, profile); }} />
          )}
        </div>
      ),
    },
    {
      title: t('operation.mawbRef') || 'MAWB',
      render: (_: any, r: Booking) => (
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold">{t('operation.mawbRef')||'MAWB'}</span>
          <span className="text-xs font-mono text-blue-500 font-bold">{r.mawbNo || '--'}</span>
        </div>
      ),
    },
    {
      title: t('common.customer'),
      render: (_: any, r: Booking) => customers.find(c => c.id === r.customerId)?.name || r.customerName || '--',
    },
    {
      title: RouteTitle,
      render: (_: any, r: Booking) => (
        <div className="flex flex-col">
          <Tag color="geekblue" className="w-fit">{r.origin} → {r.destination}</Tag>
          <span className="text-[10px] text-slate-400 mt-1">{r.flightDate ? dayjs(r.flightDate).format('YYYY-MM-DD') : '--'} / {r.carrier || '--'}</span>
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
      render: (_: any, r: Booking) => {
        const mawb = mawbs.find(m => m.mawbNo === r.mawbNo);
        return (
          <div className="flex flex-col gap-1">
            <Button size="small"
              icon={<Package size={14} style={{ color: r.manifestFileUrl ? '#3b82f6' : '#f97316' }} />}
              onClick={() => {
                if (r.manifestFileUrl) triggerDownload(r.manifestFileUrl);
                else { setManifestTarget(r); setManifestModalOpen(true); }
              }}>
              {t('operation.manifest')||'Manifest'}
            </Button>
            {mawb?.draftFileUrl && (
              <Button size="small"
                icon={<FileText size={14} style={{ color: '#3b82f6' }} />}
                onClick={() => triggerDownload(mawb.draftFileUrl!)}>
                {t('operation.steps.draft')||'Draft'}
              </Button>
            )}
          </div>
        );
      },
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

if old in content:
    content = content.replace(old, new, 1)
    print('finishedCols updated')
else:
    print('Pattern not found')
    idx = content.find('Finished Bookings Columns')
    if idx >= 0: print(content[idx:idx+800])

with open('src/modules/Operation/MawbList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')

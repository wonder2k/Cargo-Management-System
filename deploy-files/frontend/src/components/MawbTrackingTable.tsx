import React, { useEffect, useState } from "react";
import { Table, Tag, Typography, Alert, Spin, Empty, Button, Space } from "antd";
import { Clock, Info, MapPin, Plane, Package, Weight } from "lucide-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

const { Text, Title } = Typography;

interface TrackLog {
  time: string;
  status: string;
  description: string;
  location: string;
  flight_no?: string;
  pieces?: number;
  weight?: number;
}

interface MawbTrackingTableProps {
  mawbNo: string;
}

const MawbTrackingTable: React.FC<MawbTrackingTableProps> = ({ mawbNo }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [trackLogs, setTrackLogs] = useState<TrackLog[]>([]);
  const { t } = useTranslation();

  const fetchData = async () => {
    if (!mawbNo) return;
    setLoading(true);
    setError(null);

    try {
      const regRes = await fetch("/api/track/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: mawbNo }),
      });
      const regData = await regRes.json();

      if (!regRes.ok) {
        const errMsg = `[17TRACK] Register error (${regRes.status}): ${JSON.stringify(regData).slice(0, 300)}`;
        console.error(errMsg);
        setError(errMsg);
        setLoading(false);
        return;
      }

      if (regData.code === 999) {
        setError(regData.message);
        setLoading(false);
        return;
      }

      if (regData.data?.rejected && regData.data.rejected.length > 0) {
        const reject = regData.data.rejected[0];
        const code = reject.error_code ?? reject.error?.code ?? reject.code;
        if (code !== -18019901) {
          const msg = reject.error_message || reject.error?.message || reject.message || reject.error_msg || JSON.stringify(reject);
          setError(`Registration Rejected: ${msg} (Code: ${code ?? "N/A"})`);
          setLoading(false);
          return;
        }
        console.log("Note: Shipment already registered, proceeding to fetch info.");
      }

      const infoRes = await fetch("/api/track/gettrackinfo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: mawbNo }),
      });

      const result = await infoRes.json();

      if (!infoRes.ok) {
        setError(`${result.error || "Server Error"}: ${result.details || "Fetch failed"}`);
        setLoading(false);
        return;
      }

      if (result.code === 0 && result.data && Array.isArray(result.data.accepted) && result.data.accepted.length > 0) {
        const item = result.data.accepted[0];
        const awbTrackingInfos = item.track_info?.shipment?.awb_tracking_infos || [];

        if (awbTrackingInfos.length > 0) {
          // Map AWB tracking fields to our expected format
          const mapped = awbTrackingInfos.map((t: any) => ({
            time: t.date || '',
            status: t.status_code || '',
            description: t.description || '',
            location: t.station || '',
            flight_no: t.flight_no || '',
            pieces: t.pieces || 0,
            weight: parseFloat(t.weight) || 0,
          }));
          setTrackLogs(mapped);
          setError(null);
        } else {
          const awbInfo = item.track_info?.shipment?.awb_info || {};
          const latestStatus = item.track_info?.shipment?.latest_status?.status || awbInfo.status || '';
          if (latestStatus) {
            setError(`Current Status: ${latestStatus}. Waiting for tracking updates from carrier.`);
          } else {
            setError("The shipment has been registered successfully, but 17TRACK hasn't received detailed logs from the carrier yet. Please try again in 5-10 minutes.");
          }
          setTrackLogs([]);
        }
      } else if (result.data?.rejected && Array.isArray(result.data.rejected) && result.data.rejected.length > 0) {
        const reject = result.data.rejected[0];
        const msg = reject.error_message || reject.error?.message || reject.message || reject.error_msg || JSON.stringify(reject);
        const code = reject.error_code ?? reject.error?.code ?? reject.code ?? "N/A";
        setError(`17TRACK Tracking Rejected: ${msg} (Code: ${code})`);
      } else {
        const msg = result.message || "Failed to parse tracking info";
        const code = result.code !== undefined ? ` (Code: ${result.code})` : "";
        const rawHint = result ? ` (Hint: ${JSON.stringify(result).slice(0, 100)})` : "";
        setError(`${msg}${code}.${rawHint}`);
      }
    } catch (err) {
      setError("Failed to connect to tracking service");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [mawbNo]);

  const columns = [
    {
      title: t('tracking.time'),
      dataIndex: "time",
      key: "time",
      width: 180,
      render: (text: string) => (
        <Space size="small">
          <Clock size={14} className="text-slate-400" />
          <Text className="text-xs">{text ? dayjs(text).format("YYYY-MM-DD HH:mm") : "-"}</Text>
        </Space>
      ),
    },
    {
      title: t('tracking.status'),
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => {
        const statusMap: Record<string, { label: string; color: string; desc: string }> = {
          BKD: { label: t('tracking.statuses.BKD'), color: "orange", desc: "Shipment booked with carrier" },
          RCF: { label: t('tracking.statuses.RCF'), color: "blue", desc: "Received from shipper at origin" },
          DEP: { label: t('tracking.statuses.DEP'), color: "processing", desc: "Flight has departed origin" },
          ARR: { label: t('tracking.statuses.ARR'), color: "green", desc: "Flight has arrived at destination" },
          DLV: { label: t('tracking.statuses.DLV'), color: "success", desc: "Consignee has received the cargo" },
          MAN: { label: t('tracking.statuses.MAN'), color: "default", desc: "Manifest information received" },
          AWB: { label: t('tracking.statuses.AWB'), color: "cyan", desc: "Air Waybill has been issued" },
          TFD: { label: t('tracking.statuses.TFD'), color: "purple", desc: "Transferred to connecting flight" },
          RCS: { label: t('tracking.statuses.RCS'), color: "geekblue", desc: "Cargo accepted by carrier" },
          DIS: { label: t('tracking.statuses.DIS'), color: "error", desc: "Cargo discrepancy reported" },
        };

        const info = statusMap[status] || { label: status, color: "default", desc: "Status updated" };
        return (
          <Tag color={info.color} title={info.desc}>
            {info.label}
          </Tag>
        );
      },
    },
    {
      title: t('tracking.details'),
      dataIndex: "description",
      key: "description",
      render: (text: string) => (
        <div className="flex items-start gap-2">
          <Info size={14} className="text-slate-400 mt-1 flex-shrink-0" />
          <Text className="text-sm">{text}</Text>
        </div>
      ),
    },
    {
      title: t('tracking.location'),
      dataIndex: "location",
      key: "location",
      width: 120,
      render: (text: string) => (
        <Space size="small">
          <MapPin size={14} className="text-slate-400" />
          <Text className="text-sm">{text || "-"}</Text>
        </Space>
      ),
    },
    {
      title: t('tracking.flightNo'),
      dataIndex: "flight_no",
      key: "flight_no",
      width: 100,
      render: (text: string) => text ? (
        <Space size="small">
          <Plane size={14} className="text-slate-400" />
          <Text className="text-sm font-medium">{text}</Text>
        </Space>
      ) : "-",
    },
    {
      title: t('tracking.pieces'),
      dataIndex: "pieces",
      key: "pieces",
      width: 80,
      render: (text: number) => text ? (
        <Space size="small">
          <Package size={14} className="text-slate-400" />
          <Text className="text-sm">{text}</Text>
        </Space>
      ) : "-",
    },
    {
      title: t('tracking.weight'),
      dataIndex: "weight",
      key: "weight",
      width: 100,
      render: (text: number) => text ? (
        <Space size="small">
          <Weight size={14} className="text-slate-400" />
          <Text className="text-sm">{text} KG</Text>
        </Space>
      ) : "-",
    },
  ];

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <Title level={5} className="m-0">{t('tracking.title')}: {mawbNo}</Title>
        <Button type="primary" ghost onClick={fetchData} loading={loading} size="small">
          {t('tracking.refresh')}
        </Button>
      </div>

      {error && !loading && (
        <Alert message="Notice" description={error} type="info" showIcon className="mb-4" />
      )}

      <Table
        dataSource={trackLogs}
        columns={columns}
        rowKey={(record, index) => `${record.time}-${index}`}
        loading={loading}
        pagination={false}
        size="small"
        scroll={{ x: 800 }}
        locale={{ emptyText: loading ? <Spin /> : <Empty description={t('tracking.noLogs')} /> }}
        className="border rounded-lg overflow-hidden shadow-sm"
      />

      <div className="mt-2 text-right">
        <Text type="secondary" style={{ fontSize: '10px' }}>
          Data provided by 17TRACK API v2.4
        </Text>
      </div>
    </div>
  );
};

export default MawbTrackingTable;

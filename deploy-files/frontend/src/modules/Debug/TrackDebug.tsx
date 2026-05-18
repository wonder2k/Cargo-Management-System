import React, { useState, useRef } from 'react';
import { Card, Typography, Button, Input, Divider, Tag, Space, Row, Col, Alert, Spin, Timeline, App } from 'antd';
import { ArrowRight, CheckCircle2, XCircle, Activity, Webhook, Search, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const { Text, Title, Paragraph } = Typography;

interface LogEntry {
  step: string;
  method: string;
  url: string;
  request: any;
  response: any;
  status: 'pending' | 'success' | 'error';
  timestamp: string;
}

export const TrackDebug: React.FC = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [mawbNo, setMawbNo] = useState('406-81036756');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [webhookEvents, setWebhookEvents] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const addLog = (entry: LogEntry) => {
    setLogs(prev => [entry, ...prev]);
  };

  const testRegistration = async () => {
    if (!mawbNo) return;
    setLoading(true);
    const cleanNo = mawbNo.replace(/\s/g, '').replace(/-/g, '');

    // Step 1: Register
    const regPayload = [{ number: cleanNo }];
    addLog({
      step: 'Step 1: Register Tracking Number',
      method: 'POST',
      url: '/api/track/register',
      request: regPayload,
      response: 'Sending...',
      status: 'pending',
      timestamp: new Date().toISOString(),
    });

    try {
      const regRes = await fetch('/api/track/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: mawbNo }),
      });
      const regData = await regRes.json();

      // Update step 1 log
      setLogs(prev => prev.map((log, idx) =>
        idx === 0 ? { ...log, response: regData, status: regRes.ok ? 'success' : 'error' } : log
      ));

      // Step 2: Get Track Info
      const infoPayload = [{ number: cleanNo }];
      addLog({
        step: 'Step 2: Query Track Info',
        method: 'POST',
        url: '/api/track/gettrackinfo',
        request: infoPayload,
        response: 'Sending...',
        status: 'pending',
        timestamp: new Date().toISOString(),
      });

      const infoRes = await fetch('/api/track/gettrackinfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: mawbNo }),
      });
      const infoData = await infoRes.json();

      setLogs(prev => prev.map((log, idx) =>
        idx === 1 ? { ...log, response: infoData, status: infoRes.ok ? 'success' : 'error' } : log
      ));

      if (regData.code === 0 || regData.code === -18019901 || regData.code === -18019603) {
        message.success('Registration successful');
      } else if (regData.code === 999) {
        message.error('API Token not configured');
      } else if (regData.data?.rejected) {
        message.warning('Registration had rejections');
      }
    } catch (err: any) {
      setLogs(prev => prev.map((log, idx) =>
        idx < 2 ? { ...log, response: { error: err.message }, status: 'error' } : log
      ));
      message.error('Request failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Title level={2} className="flex items-center gap-2">
          <Activity size={24} className="text-blue-500" /> 17TRACK API Debug
        </Title>
        <Paragraph type="secondary">
          Step-by-step test of 17TRACK AirTrack API v2.4 — registration, query, and webhook monitoring
        </Paragraph>
      </div>

      {/* Input Section */}
      <Card className="mb-6 shadow-sm">
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Input.Search
              value={mawbNo}
              onChange={e => setMawbNo(e.target.value)}
              placeholder="Enter MAWB number"
              enterButton="Test"
              loading={loading}
              onSearch={testRegistration}
            />
          </Col>
          <Col>
            <Text type="secondary">Example: 406-81036756</Text>
          </Col>
        </Row>
      </Card>

      {/* API Flow Diagram */}
      <div className="mb-6">
        <Text strong className="text-sm">API Flow:</Text>
        <div className="flex items-center gap-2 mt-2 text-xs">
          <Tag color="blue">1. POST /track/v2.4/register</Tag>
          <ArrowRight size={14} />
          <Tag color="green">2. POST /track/v2.4/gettrackinfo</Tag>
          <ArrowRight size={14} />
          <Tag color="purple">3. POST /api/webhook/17track (push)</Tag>
        </div>
      </div>

      {/* Logs */}
      {logs.length === 0 && (
        <Card className="mb-6 bg-slate-50">
          <div className="text-center py-8 text-slate-400">
            <Search size={32} className="mb-2 mx-auto" />
            <Text type="secondary">Enter a MAWB number and click "Test" to begin</Text>
          </div>
        </Card>
      )}

      {logs.map((log, idx) => (
        <Card key={idx} className="mb-4 shadow-sm" size="small"
          title={
            <Space>
              {log.status === 'success' ? <CheckCircle2 size={16} className="text-green-500" /> :
               log.status === 'error' ? <XCircle size={16} className="text-red-500" /> :
               <Spin size="small" />}
              <Text strong>{log.step}</Text>
              <Tag color="blue">{log.method}</Tag>
              <Text code className="text-xs">{log.url}</Text>
              <Text type="secondary" className="text-xs">{new Date(log.timestamp).toLocaleTimeString()}</Text>
            </Space>
          }>
          <Row gutter={16}>
            <Col span={12}>
              <Text type="secondary" className="text-xs block mb-1">Request Body:</Text>
              <pre className="bg-slate-50 p-2 rounded text-xs overflow-auto max-h-40 border">
                {JSON.stringify(log.request, null, 2)}
              </pre>
            </Col>
            <Col span={12}>
              <Text type="secondary" className="text-xs block mb-1">Response Body:</Text>
              <pre className="bg-slate-50 p-2 rounded text-xs overflow-auto max-h-40 border"
                style={{ borderColor: log.status === 'success' ? '#22c55e' : log.status === 'error' ? '#ef4444' : '#e5e7eb' }}>
                {typeof log.response === 'string' ? log.response : JSON.stringify(log.response, null, 2)}
              </pre>
            </Col>
          </Row>
        </Card>
      ))}

      {/* Webhook Section */}
      <Card className="mb-6 shadow-sm" size="small"
        title={<Space><Webhook size={16} className="text-purple-500" /> <Text strong>Webhook Listener</Text></Space>}>
        <Alert
          type="info"
          showIcon
          message="Webhook Endpoint"
          description={
            <div>
              <Text code>POST /api/webhook/17track</Text>
              <Text className="ml-2">— Configure this URL in your 17TRACK console for push updates</Text>
              <div className="mt-2">
                <Text type="secondary" className="text-xs">
                  Server URL: <Text code>http://46.225.57.139:8080/api/webhook/17track</Text>
                </Text>
              </div>
            </div>
          }
        />
        <Divider />
        <Text strong className="text-sm">Next Steps:</Text>
        <div className="mt-2 space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <Tag color="blue">1</Tag>
            <Text>The register endpoint has been called above</Text>
          </div>
          <div className="flex items-start gap-2">
            <Tag color="blue">2</Tag>
            <Text>Set the webhook URL in 17TRACK Console → AirTrack Settings → Callback URL</Text>
          </div>
          <div className="flex items-start gap-2">
            <Tag color="blue">3</Tag>
            <Text>When 17TRACK receives tracking updates, it will push to the webhook URL above</Text>
          </div>
          <div className="flex items-start gap-2">
            <Tag color="blue">4</Tag>
            <Text>Check backend logs: <Text code>docker compose logs backend | grep "17TRACK"</Text></Text>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TrackDebug;

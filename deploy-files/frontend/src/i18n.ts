import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      common: {
        dashboard: "Dashboard",
        customers: "Customers",
        pricing: "Rates",
        quotes: "Quotes",
        bookings: "Bookings",
        operation: "Operation",
        finance: "Finance",
        users: "Users",
        profile: "Profile",
        settings: "Settings",
        logout: "Logout",
        search: "Search",
        add: "Add",
        edit: "Edit",
        delete: "Delete",
        save: "Save",
        cancel: "Cancel",
        confirm: "Confirm",
        actions: "Actions",
        status: "Status",
        date: "Date",
        weight: "Weight",
        volume: "Volume",
        pieces: "Pieces",
        carrier: "Carrier",
        origin: "Origin",
        destination: "Destination",
        remarks: "Remarks",
        all: "All"
      },
      dashboard: {
        overview: "Business Overview",
        totalShipments: "Total Shipments",
        pendingBookings: "Pending Bookings",
        activeOperations: "Active Operations",
        monthlyRevenue: "Monthly Revenue",
        recentActivities: "Recent Activities",
        revenueGrowth: "Revenue Growth",
        shipmentGrowth: "Shipment Growth"
      },
      pricing: {
        title: "Price Cabinet",
        addRate: "Add Flight Rate",
        flightNo: "Flight No",
        aircraft: "Aircraft",
        schedule: "Schedule",
        baseFreight: "Base Freight",
        fuel: "Fuel",
        security: "Security",
        terminal: "Terminal",
        total: "Total",
        effective: "Effective Until",
        quote: "Quote",
        batchQuote: "Batch Quote",
        customsMethod: "Customs Method",
        miscFees: "Misc Fees"
      },
      quotes: {
        title: "Quotation History",
        quoteNo: "Quote No",
        client: "Client",
        amount: "Amount",
        download: "Download PDF",
        records: "Records"
      },
      bookings: {
        title: "Booking Management",
        create: "Create Booking",
        bookingNo: "Booking No",
        flightDate: "Flight Date",
        goodsDesc: "Goods Description",
        declaration: "Declaration",
        details: "Details"
      },
      operation: {
        title: "MAWB Operations",
        mawbNo: "MAWB No",
        tracking: "Tracking",
        warehouse: "Warehouse",
        customs: "Customs",
        terminal: "Terminal",
        departure: "Departure",
        arrival: "Arrival",
        logs: "Operation Logs"
      },
      finance: {
        title: "Financial Settlement",
        ar: "Account Receivable",
        ap: "Account Payable",
        invoiceNo: "Invoice No",
        dueDate: "Due Date",
        outstanding: "Outstanding",
        profit: "Profit Analysis"
      }
    }
  },
  zh: {
    translation: {
      common: {
        dashboard: "工作台",
        customers: "客户管理",
        pricing: "运价查询",
        quotes: "报价历史",
        bookings: "订舱管理",
        operation: "操作中心",
        finance: "财务结算",
        users: "用户管理",
        profile: "个人中心",
        settings: "系统设置",
        logout: "退出登录",
        search: "搜索",
        add: "新增",
        edit: "编辑",
        delete: "删除",
        save: "保存",
        cancel: "取消",
        confirm: "确认",
        actions: "操作",
        status: "状态",
        date: "日期",
        weight: "重量",
        volume: "体积",
        pieces: "件数",
        carrier: "航司",
        origin: "始发站",
        destination: "目的站",
        remarks: "备注",
        all: "全部"
      },
      dashboard: {
        overview: "业务概览",
        totalShipments: "总出货量",
        pendingBookings: "待处理订舱",
        activeOperations: "进行中操作",
        monthlyRevenue: "月度营收",
        recentActivities: "最近动态",
        revenueGrowth: "营收环比",
        shipmentGrowth: "货量环比"
      },
      pricing: {
        title: "运价板",
        addRate: "新增运价",
        flightNo: "航班号",
        aircraft: "机型",
        schedule: "班期",
        baseFreight: "基础运费",
        fuel: "燃油附加",
        security: "安检费",
        terminal: "地勤费",
        total: "总计",
        effective: "有效期至",
        quote: "报价",
        batchQuote: "批量报价",
        customsMethod: "报关方式",
        miscFees: "杂费"
      },
      quotes: {
        title: "报价单记录",
        quoteNo: "报价单号",
        client: "客户",
        amount: "金额",
        download: "下载PDF",
        records: "记录"
      },
      bookings: {
        title: "订舱列表",
        create: "创建订舱",
        bookingNo: "订舱号",
        flightDate: "航班日期",
        goodsDesc: "货物描述",
        declaration: "报关方式",
        details: "详情"
      },
      operation: {
        title: "主单列表",
        mawbNo: "主单号",
        tracking: "轨迹追踪",
        warehouse: "进仓管理",
        customs: "报关状态",
        terminal: "分拨理货",
        departure: "起飞",
        arrival: "到达",
        logs: "操作日志"
      },
      finance: {
        title: "结算中心",
        ar: "应收管理",
        ap: "应付管理",
        invoiceNo: "账单号",
        dueDate: "到期日期",
        outstanding: "未结金额",
        profit: "利润分析"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

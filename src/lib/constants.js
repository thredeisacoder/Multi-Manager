export const PLATFORMS = {
  etsy: {
    name: 'Etsy',
    slug: 'etsy',
    color: '#f56400',
    icon: 'etsy',
    fieldSchema: [
      { key: 'proxy', label: 'Proxy', type: 'text', encrypted: false },
      { key: 'date_proxy', label: 'Date Proxy', type: 'text', encrypted: false },
      { key: 'shop_name', label: 'Shop Name', type: 'text', encrypted: false },
      { key: 'full_name', label: 'Full Name', type: 'text', encrypted: false },
      { key: 'address', label: 'Address', type: 'text', encrypted: false },
      { key: 'ssn', label: 'SSN', type: 'text', encrypted: true },
      { key: 'dob', label: 'DOB', type: 'text', encrypted: false },
      { key: 'phone', label: 'Phone', type: 'text', encrypted: false },
      { key: 'link_shop', label: 'Link Shop', type: 'url', encrypted: false },
      { key: 'status', label: 'Status', type: 'select', encrypted: false, options: ['Active', 'Inactive', 'Suspended', 'Banned'] },
      { key: 'password_etsy', label: 'Password Etsy', type: 'text', encrypted: true },
      { key: 'mail', label: 'Mail', type: 'email', encrypted: false },
      { key: 'password_mail', label: 'Password Mail', type: 'text', encrypted: true },
      { key: 'mail_recovery', label: 'Mail Recovery', type: 'email', encrypted: false },
      { key: 'twofa_etsy', label: '2FA Etsy', type: 'text', encrypted: true },
      { key: 'recovery_code_etsy', label: 'Recovery Code Etsy', type: 'text', encrypted: true },
      { key: 'twofa_mail', label: '2FA Mail', type: 'text', encrypted: true },
      { key: 'recovery_code_mail', label: 'Recovery Code Mail', type: 'text', encrypted: true },
      { key: 'bank_number', label: 'Bank Number', type: 'text', encrypted: true },
      { key: 'bank_routing_number', label: 'Bank Routing Number', type: 'text', encrypted: true },
      { key: 'note_1', label: 'Note 1', type: 'textarea', encrypted: false },
      { key: 'note_2', label: 'Note 2', type: 'textarea', encrypted: false },
    ],
  },
  ebay: {
    name: 'eBay',
    slug: 'ebay',
    color: '#ff0008ff',
    icon: 'ebay',
    fieldSchema: [
      { key: 'date_reg', label: 'Date Reg', type: 'text', encrypted: false },
      { key: 'proxy', label: 'Proxy', type: 'text', encrypted: false },
      { key: 'name', label: 'Name', type: 'text', encrypted: false },
      { key: 'limit', label: 'Limit', type: 'text', encrypted: false },
      { key: 'username', label: 'Username', type: 'text', encrypted: false },
      { key: 'mail', label: 'Mail', type: 'email', encrypted: false },
      { key: 'password_mail', label: 'Password Mail', type: 'text', encrypted: true },
      { key: 'recovery_mail', label: 'Recovery Mail', type: 'email', encrypted: false },
      { key: 'twofa_mail', label: '2FA Mail', type: 'text', encrypted: true },
      { key: 'password_ebay', label: 'Password Ebay', type: 'text', encrypted: true },
      { key: 'phone', label: 'Phone', type: 'text', encrypted: false },
      { key: 'address', label: 'Address', type: 'text', encrypted: false },
      { key: 'ssn', label: 'SSN', type: 'text', encrypted: true },
      { key: 'dob', label: 'DOB', type: 'text', encrypted: false },
      { key: 'twofa_ebay', label: '2FA Ebay', type: 'text', encrypted: true },
      { key: 'cookies', label: 'Cookies', type: 'textarea', encrypted: false },
      { key: 'note', label: 'Note', type: 'textarea', encrypted: false },
    ],
  },
  gmail: {
    name: 'Gmail',
    slug: 'gmail',
    color: '#EA4335',
    icon: 'gmail',
    fieldSchema: [
      { key: 'gmail', label: 'Gmail', type: 'email', encrypted: false },
      { key: 'password', label: 'Password', type: 'text', encrypted: true },
      { key: 'phone', label: 'Phone', type: 'text', encrypted: false },
      { key: 'proxy', label: 'Proxy', type: 'text', encrypted: false },
      { key: 'note', label: 'Note', type: 'textarea', encrypted: false },
    ],
  },
  shopify: {
    name: 'Shopify',
    slug: 'shopify',
    color: '#00ff00ff',
    icon: 'shopify',
    fieldSchema: [
      { key: 'create_date', label: 'Create Date', type: 'date', encrypted: false },
      { key: 'status', label: 'Status', type: 'select', encrypted: false, options: ['Active', 'Inactive', 'Suspended', 'Banned'] },
      { key: 'shop_name', label: 'Shop Name', type: 'text', encrypted: false },
      { key: 'link_shop', label: 'Link Shop', type: 'url', encrypted: false },
      { key: 'page', label: 'Page', type: 'url', encrypted: false },
      { key: 'mail', label: 'Mail', type: 'email', encrypted: false },
      { key: 'pass_mail_shopify', label: 'Password Mail / Shopify', type: 'text', encrypted: true },
      { key: 'recovery_mail', label: 'Recovery Mail', type: 'email', encrypted: false },
      { key: 'twofa_mail', label: '2FA Mail', type: 'text', encrypted: true },
      { key: '2fa_shopify', label: '2FA Shopify', type: 'text', encrypted: true },
      { key: 'name', label: 'Name', type: 'text', encrypted: false },
      { key: 'dob', label: 'DOB', type: 'date', encrypted: false },
      { key: 'address', label: 'Address', type: 'text', encrypted: false },
      { key: 'ssn', label: 'SSN', type: 'text', encrypted: true },
      { key: 'proxy', label: 'Proxy', type: 'text', encrypted: true }
    ],
  }
};

export const DEFAULT_FINANCE_FIELDS = [
  { name: 'Monthly Payout', type: 'income' },
  { name: 'Fulfillment Cost', type: 'expense' },
  { name: 'Shipping Cost', type: 'expense' },
  { name: 'Platform Fee', type: 'expense' },
  { name: 'Advertising (Ads)', type: 'expense' },
  { name: 'Material/Product Cost', type: 'expense' },
  { name: 'Transaction Fee', type: 'expense' },
  { name: 'Refund/Return Cost', type: 'expense' },
  { name: 'Subscription/Tools', type: 'expense' },
  { name: 'Tax', type: 'expense' },
  { name: 'Other Income', type: 'income' },
  { name: 'Other Expense', type: 'expense' },
];

export const DEFAULT_PERSONAL_FINANCE_FIELDS = [
  { name: 'Salary', type: 'income' },
  { name: 'Bonus / Extra', type: 'income' },
  { name: 'Other Income', type: 'income' },
  { name: 'Rent / Mortgage', type: 'expense' },
  { name: 'Food / Dining', type: 'expense' },
  { name: 'Utilities / Bills', type: 'expense' },
  { name: 'Transportation', type: 'expense' },
  { name: 'Shopping', type: 'expense' },
  { name: 'Entertainment', type: 'expense' },
  { name: 'Healthcare', type: 'expense' },
  { name: 'Other Expense', type: 'expense' }
];

export const DEFAULT_DEBT_FIELDS = [
  { name: 'Borrowed Amount', type: 'debt' },
  { name: 'Principal Repayment', type: 'debt_payment' },
  { name: 'Interest Fee', type: 'expense' },
];

export const ACCOUNT_STATUSES = [
  { value: 'active', label: 'Active', color: '#00ff88' },
  { value: 'inactive', label: 'Inactive', color: '#feca57' },
  { value: 'suspended', label: 'Suspended', color: '#ff9f43' },
  { value: 'banned', label: 'Banned', color: '#ff4757' },
];

export const PLATFORM_LIST = Object.values(PLATFORMS);

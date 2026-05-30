export const SALES_DATA = [
    {
        id: 's1',
        target: 'المخزن الرئيسي',
        date: '2023-11-20',
        status: 'delivered', // delivered, pending, canceled
        total: '3,250 ج.م',
        items: 45,
        reference: 'TR-2023-1120-01',
        itemsList: [
            {
                id: '1',
                name: 'بانادول اكسترا 24 قرص',
                qty: 20,
                price: '150 ج.م',
                discount: '0 ج.م',
                total: '3,000 ج.م'
            },
            {
                id: '2',
                name: 'كمامات طبية 50 قطعة',
                qty: 5,
                price: '50 ج.م',
                discount: '0 ج.م',
                total: '250 ج.م'
            }
        ]
    },
    {
        id: 's2',
        target: 'فرع مدينة نصر',
        date: '2023-11-19',
        status: 'pending',
        total: '1,800 ج.م',
        items: 12,
        reference: 'TR-2023-1119-02',
        itemsList: [
            {
                id: '1',
                name: 'أوميجا 3 بلس 30 كبسولة',
                qty: 10,
                price: '150 ج.م',
                discount: '0 ج.م',
                total: '1,500 ج.م'
            },
            {
                id: '2',
                name: 'فيتامين د3 10000 وحدة',
                qty: 2,
                price: '150 ج.م',
                discount: '0 ج.م',
                total: '300 ج.م'
            }
        ]
    },
    {
        id: 's3',
        target: 'المخزن الرئيسي',
        date: '2023-11-15',
        status: 'canceled',
        total: '500 ج.م',
        items: 5,
        reference: 'TR-2023-1115-01',
        itemsList: [
            {
                id: '1',
                name: 'قطرة سيستان للعين',
                qty: 5,
                price: '100 ج.م',
                discount: '0 ج.م',
                total: '500 ج.م'
            }
        ]
    },
];

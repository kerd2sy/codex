export const RETURNS_DATA = [
    {
        id: 'r1',
        customer: 'أحمد محمود',
        date: '2023-11-20',
        status: 'refunded',
        total: '450 ج.م',
        items: 2,
        reason: 'تاريخ الصلاحية قريب',
        itemsList: [
            {
                id: '1',
                name: 'بانادول اكسترا 24 قرص',
                qty: 1,
                price: '150 ج.م',
                discount: '0 ج.م',
                total: '150 ج.م'
            },
            {
                id: '2',
                name: 'فيتامين سي 1000 مجم',
                qty: 1,
                price: '300 ج.م',
                discount: '0 ج.م',
                total: '300 ج.م'
            }
        ]
    },
    {
        id: 'r2',
        customer: 'سارة خالد',
        date: '2023-11-18',
        status: 'pending',
        total: '120 ج.م',
        items: 1,
        reason: 'منتج غير صحيح',
        itemsList: [
            {
                id: '1',
                name: 'قطرة جفاف العين',
                qty: 1,
                price: '120 ج.م',
                discount: '0 ج.م',
                total: '120 ج.م'
            }
        ]
    },
    {
        id: 'r3',
        customer: 'محمد علي',
        date: '2023-11-15',
        status: 'rejected',
        total: '850 ج.م',
        items: 3,
        reason: 'تم استخدام المنتج',
        itemsList: [
            {
                id: '1',
                name: 'شامبو طبي 250 مل',
                qty: 2,
                price: '200 ج.م',
                discount: '0 ج.م',
                total: '400 ج.م'
            },
            {
                id: '2',
                name: 'غسول للبشرة الدهنية',
                qty: 1,
                price: '450 ج.م',
                discount: '0 ج.م',
                total: '450 ج.م'
            }
        ]
    },
];

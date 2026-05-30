export const PURCHASES_DATA = [
    {
        id: '1',
        supplier: 'الشركة المتحدة للصيادلة',
        date: '2024-03-05',
        total: '15,420 ج.م',
        status: 'delivered',
        items: 12,
        itemsList: [
            { id: '1', name: 'بنادول إكسترا 500مجم', qty: 10, price: '45.00', discount: '5%', total: '427.50' },
            { id: '2', name: 'كونجستال أقراص', qty: 20, price: '30.00', discount: '10%', total: '540.00' },
            { id: '3', name: 'أوجمنتين 1 جم', qty: 5, price: '90.00', discount: '2%', total: '441.00' },
            { id: '4', name: 'فولتارين جل 50 جم', qty: 15, price: '55.00', discount: '7%', total: '767.25' },
            { id: '5', name: 'انتينال كبسول', qty: 12, price: '25.00', discount: '0%', total: '300.00' },
        ]
    },
    {
        id: '2',
        supplier: 'ابن سينا فارما',
        date: '2024-03-03',
        total: '8,200 ج.م',
        status: 'delivered',
        items: 5,
        itemsList: [
            { id: '1', name: 'بروفين 400مجم', qty: 30, price: '20.00', discount: '10%', total: '540.00' },
            { id: '2', name: 'سيبروفار 500مجم', qty: 10, price: '40.00', discount: '5%', total: '380.00' },
        ]
    },
    {
        id: '3',
        supplier: 'مجموعة النيل للأدوية',
        date: '2024-03-01',
        total: '2,150 ج.م',
        status: 'pending',
        items: 3,
        itemsList: [
            { id: '1', name: 'فيتامين سي 1000مجم', qty: 5, price: '60.00', discount: '5%', total: '285.00' },
        ]
    },
    {
        id: '4',
        supplier: 'فارما أوفرسيز',
        date: '2024-02-28',
        total: '12,000 ج.م',
        status: 'delivered',
        items: 20,
        itemsList: [
            { id: '1', name: 'سنتروم فيتامينات', qty: 10, price: '400.00', discount: '8%', total: '3680.00' },
        ]
    },
    {
        id: '5',
        supplier: 'رامكو فارما',
        date: '2024-02-25',
        total: '4,560 ج.م',
        status: 'cancelled',
        items: 8,
        itemsList: [
            { id: '1', name: 'أدرينالين حقن', qty: 2, price: '100.00', discount: '0%', total: '200.00' },
        ]
    },
];

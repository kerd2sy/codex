export interface OcrResult {
    batch: string;
    expiry: string;
}

/**
 * Sends a captured image to ocr.space and extracts Expiry Date & Batch Number
 * @param imageUri Local image URI from expo-image-picker
 * @returns Extracted OcrResult
 */
export const performOcr = async (
    imageUri: string, 
    cropTarget: 'batch' | 'expiry' | 'none' = 'none'
): Promise<OcrResult> => {
    try {
        console.log("[OCR] Preparing image upload to OCR.space...", imageUri);
        
        const formData = new FormData();
        // Using OCR.space helloworld key for demo/rate-limited queries, 
        // and standard free registration key K88722956288957 for higher limits
        formData.append('apikey', 'K88722956288957'); 
        formData.append('language', 'eng'); // Arabic can also be 'ara' if needed
        formData.append('isOverlayRequired', 'false');
        
        // Prepare file object for React Native FormData upload
        const filename = imageUri.split('/').pop() || 'ocr_image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        
        formData.append('file', {
            uri: imageUri,
            name: filename,
            type: type,
        } as any);
 
        console.log("[OCR] Sending request to OCR.space API...");
        const response = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json',
            },
        });
 
        if (!response.ok) {
            throw new Error(`OCR Server returned status: ${response.status}`);
        }
 
        const data = await response.json();
        console.log("[OCR] API Response:", JSON.stringify(data).slice(0, 300));
 
        if (data.IsErroredOnProcessing || !data.ParsedResults || data.ParsedResults.length === 0) {
            const errMsg = data.ErrorMessage ? data.ErrorMessage.join(', ') : 'Failed to process image';
            throw new Error(errMsg);
        }
 
        const parsedText = data.ParsedResults[0].ParsedText || '';
        console.log("[OCR] Parsed Text:", parsedText);
 
        return parseOcrText(parsedText, cropTarget);
    } catch (error) {
        console.error("[OCR] Critical error during OCR processing:", error);
        throw error;
    }
};

const translateArabicNumerals = (text: string): string => {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    let result = text;
    for (let i = 0; i < 10; i++) {
        const regex = new RegExp(arabicDigits[i], 'g');
        result = result.replace(regex, i.toString());
    }
    return result;
};

/**
 * Parses raw text from OCR to extract Batch Number & Expiry Date using Regular Expressions
 * @param text The parsed string from the OCR engine
 */
export const parseOcrText = (
    text: string, 
    cropTarget: 'batch' | 'expiry' | 'none' = 'none'
): OcrResult => {
    let batch = '';
    let expiry = '';
 
    // Translate eastern Arabic numerals to standard digits (e.g. ٢٠٢٨ -> 2028)
    const normalizedText = translateArabicNumerals(text);
    console.log("[OCR] Normalized Text:", normalizedText);

    // If this is a cropped target, we know the cropped image contains ONLY that item!
    // So we can bypass the strict regex and capture it directly!
    if (cropTarget === 'batch') {
        const cleanBatch = normalizedText.replace(/[^a-zA-Z0-9]/g, '').trim().toUpperCase();
        if (cleanBatch.length >= 2) {
            return { batch: cleanBatch, expiry: '' };
        }
    }

    if (cropTarget === 'expiry') {
        // Strip out non-alphanumeric to find date
        const digits = normalizedText.replace(/[^0-9]/g, '').trim();
        if (/^\d{3,4}$/.test(digits)) {
            return { batch: '', expiry: digits }; // Will be shorthand parsed in dashboard
        }
    }
 
    // Split text into lines for granular matching
    const lines = normalizedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // 1. MATCH EXPIRY DATE
    // Search with priority for lines that contain indicators like EXP, Expiry, Validity, تاريخ, صلاحية
    const dateKeywords = ['exp', 'expiry', 'valid', 'val', 'صلاح', 'تاريخ', 'ينتهي', 'غاية', 'تا', 'ص'];
    
    // First pass: look for lines containing date keywords
    for (const line of lines) {
        const lowerLine = line.toLowerCase();
        const hasKeyword = dateKeywords.some(keyword => lowerLine.includes(keyword));
        
        if (hasKeyword) {
            // Find MM/YY or MM/YYYY or YYYY/MM with flexible separators
            // Separator can be /, -, ., space, |, \, or even misread slashes like 1 or l
            const match = lowerLine.match(/\b(0[1-9]|1[0-2])[\/\-\.\s\:\\\|l1]+(20[2-3][0-9]|[2-3][0-9])\b/) ||
                          lowerLine.match(/\b(20[2-3][0-9]|[2-3][0-9])[\/\-\.\s\:\\\|l1]+(0[1-9]|1[0-2])\b/);
            
            if (match) {
                let month = match[1];
                let year = match[2];
                
                // Swap if year was detected first
                if (month.length === 4 || (month.length === 2 && parseInt(month, 10) > 12)) {
                    const temp = month;
                    month = year;
                    year = temp;
                }
                
                if (year.length === 2) {
                    year = '20' + year;
                }
                
                expiry = `${year}-${month.padStart(2, '0')}-01`;
                break;
            }
        }
    }

    // Second pass: if no expiry found, search all lines for any standalone date format
    if (!expiry) {
        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            const match = lowerLine.match(/\b(0[1-9]|1[0-2])[\/\-\.\s\:\\\|l1]+(20[2-3][0-9]|[2-3][0-9])\b/) ||
                          lowerLine.match(/\b(20[2-3][0-9]|[2-3][0-9])[\/\-\.\s\:\\\|l1]+(0[1-9]|1[0-2])\b/);
            
            if (match) {
                let month = match[1];
                let year = match[2];
                
                if (month.length === 4 || (month.length === 2 && parseInt(month, 10) > 12)) {
                    const temp = month;
                    month = year;
                    year = temp;
                }
                
                if (year.length === 2) {
                    year = '20' + year;
                }
                
                expiry = `${year}-${month.padStart(2, '0')}-01`;
                break;
            }
        }
    }

    // Third pass: check for contiguous digits (e.g. 092028 or 0928 or 09128 where 1 is misread slash)
    if (!expiry) {
        for (const line of lines) {
            const digitsMatch = line.match(/\b(\d{4,8})\b/);
            if (digitsMatch) {
                const digits = digitsMatch[1];
                if (digits.length === 4) {
                    // MMYY
                    const month = parseInt(digits.slice(0, 2), 10);
                    const year = parseInt(digits.slice(2), 10);
                    if (month >= 1 && month <= 12 && year >= 20 && year <= 39) {
                        expiry = `20${year}-${digits.slice(0, 2)}-01`;
                        break;
                    }
                } else if (digits.length === 5) {
                    // MM1YY (e.g. 09128 where 1 is slash)
                    const month = parseInt(digits.slice(0, 2), 10);
                    const year = parseInt(digits.slice(3), 10);
                    if (month >= 1 && month <= 12 && year >= 20 && year <= 39) {
                        expiry = `20${year}-${digits.slice(0, 2)}-01`;
                        break;
                    }
                } else if (digits.length === 6) {
                    // MMYYYY
                    const month = parseInt(digits.slice(0, 2), 10);
                    const year = parseInt(digits.slice(2), 10);
                    if (month >= 1 && month <= 12 && year >= 2020 && year <= 2039) {
                        expiry = `${year}-${digits.slice(0, 2)}-01`;
                        break;
                    }
                } else if (digits.length === 7) {
                    // MM1YYYY (e.g. 0912028)
                    const month = parseInt(digits.slice(0, 2), 10);
                    const year = parseInt(digits.slice(3), 10);
                    if (month >= 1 && month <= 12 && year >= 2020 && year <= 2039) {
                        expiry = `${year}-${digits.slice(0, 2)}-01`;
                        break;
                    }
                }
            }
        }
    }

    // 2. MATCH BATCH NUMBER
    // First pass: look for batch keywords (b.n, lot, batch, ch.b, ch, تشغيلة, رقم, باتش)
    const batchKeywords = ['b.n', 'b.no', 'batch', 'lot', 'b/n', 'ch.b', 'ch', 'تشغيلة', 'رقم', 'باتش', 'الحصة'];
    for (const line of lines) {
        const lowerLine = line.toLowerCase();
        const hasKeyword = batchKeywords.some(keyword => lowerLine.includes(keyword));
        
        if (hasKeyword) {
            const match = lowerLine.match(/(?:b\.?n\.?|b\.?no\.?|batch|lot|b\/n|ch\.?b\.?|ch|تشغيلة|رقم|باتش|الحصة)\s*[:\-\s\.]*\s*([a-zA-Z0-9]{3,12})/i);
            if (match && match[1]) {
                const val = match[1].trim();
                // Filter out standard years or dates
                if (!/^(202[0-9]|203[0-9]|[2-3][0-9])$/.test(val)) {
                    batch = val.toUpperCase();
                    break;
                }
            }
        }
    }

    // Second pass: if no batch found, fall back to any uppercase alphanumeric token between 4 and 10 chars
    if (!batch) {
        for (const line of lines) {
            // Remove special chars and check line tokens
            const tokens = line.split(/[\s\:\-\,\.\/]/).map(t => t.trim()).filter(t => t.length >= 4 && t.length <= 10);
            for (const token of tokens) {
                const cleanToken = token.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                if (
                    cleanToken.length >= 4 &&
                    cleanToken.length <= 10 &&
                    /^[A-Z0-9]+$/.test(cleanToken) &&
                    !/^(202[0-9]|203[0-9])$/.test(cleanToken) && // Not a year
                    !/^(0[1-9]|1[0-2])(20[2-3][0-9]|[2-3][0-9])$/.test(cleanToken) // Not a date MMYY / MMYYYY
                ) {
                    // Skip small integer numbers
                    if (/^\d+$/.test(cleanToken) && cleanToken.length < 5) {
                        continue;
                    }
                    batch = cleanToken;
                    break;
                }
            }
            if (batch) break;
        }
    }

    return { batch, expiry };
};

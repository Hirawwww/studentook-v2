const QRCode = require('qrcode');

const generateQRCode = async (text) => {
    try {
        const qrDataURL = await QRCode.toDataURL(text);
        console.log('QR Cide generated successfully!');
        console.log(qrDataURL);

        await QRCode.toFile('qrcode.png', text);
        console.log('QR Code saved to qrcode.png');
    } catch (err) {
        console.error('Error generating QR Code', err);

    };
    
    const textToEncode = 'https://www.flaticon.com/search?word=accessories';
    generateQRCode(textToEncode);
}
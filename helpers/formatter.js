const phoneNumberFormatter = function(number) {
	//menghilangkan karakter selain angka
	let formatted = number.replace(/\D/g, '');

	//menghilangkan angka 0
	//kemudian ganti dengan 62 (kode indo)
	if (formatted.startsWith('0')) {
		formatted = '62' + formatted.substr(1);
	}

	if (!formatted.endsWith('@c.us')) {
		formatted += '@c.us';
	}

	return formatted;
}

module.exports = {
	phoneNumberFormatter
}
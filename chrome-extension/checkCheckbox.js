export function checkAndMarkCheckbox(element) {
  const checkbox = element.querySelector('input[type="checkbox"]');
  if (checkbox) {
    checkbox.checked = true;
    return true;
  }
  return false;
}

export function checkAndMarkCheckboxByBarcode(barcode) {
  let checked = false;
  const checkbox = document.querySelector(
    `input[type="checkbox"][id="${barcode}"]`
  );
  if (checkbox) {
    try {
      if (!checkbox.checked) {
        checkbox.click();
      }
      checked = true;
    } catch (e) {
      // 오류 발생 시 checked는 false로 유지
    }
  }
  return checked;
}

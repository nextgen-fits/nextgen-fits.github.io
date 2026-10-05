document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-print-guide]').forEach(b => b.addEventListener('click', () => window.print()));
  const form = document.querySelector('[data-rate-form]');
  if (form) form.addEventListener('submit', event => {
    event.preventDefault();
    const output = form.querySelector('output');
    const values = ['start', 'end', 'hours'].map(name => form.elements.namedItem(name).value.trim());
    const [start, end, hours] = values.map(Number);
    if (values.some(v => v === '') || ![start, end, hours].every(Number.isFinite) || hours <= 0) {
      output.textContent = 'Enter both signed offsets and an elapsed time greater than zero.';
      return;
    }
    const difference = end - start;
    const rate = difference * 24 / hours;
    const signed = n => `${n > 0 ? '+' : ''}${n.toFixed(1)}`;
    output.textContent = `Offset change: ${signed(difference)} seconds over ${hours} hours. Calculated daily rate: ${signed(rate)} seconds/day. ${rate > 0 ? 'The watch gained time during this interval.' : rate < 0 ? 'The watch lost time during this interval.' : 'No offset change was recorded.'} This calculation is not a movement diagnosis.`;
  });
  const shrinkForm = document.querySelector('[data-shrink-form]');
  if (shrinkForm) shrinkForm.addEventListener('submit', event => {
    event.preventDefault();
    const output = shrinkForm.querySelector('output');
    const raw = ['before', 'after'].map(name => shrinkForm.elements.namedItem(name).value.trim());
    const [before, after] = raw.map(Number);
    if (raw.some(v => !v) || ![before, after].every(Number.isFinite) || before <= 0 || after <= 0) {
      output.textContent = 'Enter two measurements greater than zero, in the same units.';
      return;
    }
    const percent = (before - after) / before * 100;
    output.textContent = `Calculated dimensional change: ${percent.toFixed(1)}%. ${percent > 0 ? 'The later dimension is smaller.' : percent < 0 ? 'The later dimension is larger.' : 'The entered dimensions are equal.'} This is arithmetic, not a fabric diagnosis.`;
  });
  document.querySelectorAll('[data-checklist]').forEach(list => {
    const output = list.parentElement.querySelector('[data-check-count]');
    if (!output) return;
    const update = () => {
      const all = list.querySelectorAll('input[type=checkbox]');
      const done = list.querySelectorAll('input[type=checkbox]:checked');
      output.textContent = `${done.length} of ${all.length} items checked. This list records your progress; it does not certify compatibility.`;
    };
    list.addEventListener('change', update);
    update();
  });
});

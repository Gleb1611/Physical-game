// ============================================================
//  Реестр элементов по темам
// ============================================================

const REGISTRY = {
  mechanics: [
    { cls: Block,    label: 'Блок',    icon: '▭' },
    { cls: Spring,   label: 'Пружина', icon: '〰️' },
    { cls: Pendulum, label: 'Маятник', icon: '⏱' },
  ],
  optics: [
    { cls: LightSource, label: 'Свет',    icon: '💡' },
    { cls: Lens,        label: 'Линза',   icon: '🔵' },
    { cls: Mirror,      label: 'Зеркало', icon: '🪞' },
  ],
  electricity: [
    { cls: Battery,  label: 'Батарея',  icon: '🔋' },
    { cls: Resistor, label: 'Резистор', icon: '⏛' },
    { cls: Lamp,     label: 'Лампа',    icon: '💡' },
    { cls: Wire,     label: 'Провод',   icon: '─' },
    { cls: Switch,   label: 'Ключ',     icon: '⌇' },
  ],
};
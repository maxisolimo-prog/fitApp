import { Component, Input } from '@angular/core';

const paths: Record<string, string> = {
  home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  dumbbell: 'm6 4 14 14M4 6l2-2m12 16 2-2M2 8l6-6m8 20 6-6M8 10l2-2m4 8 2-2',
  calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2m3 11h.01M12 15h.01M16 15h.01',
  chart: 'M4 3v17h17M8 15l4-5 4 2 5-7',
  book: 'M12 5v16m0-16C8 2 3 3 2 4v15c3-2 7-1 10 2m0-16c4-3 9-2 10-1v15c-3-2-7-1-10 2',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  chevron: 'm9 5 7 7-7 7',
  left: 'm15 5-7 7 7 7',
  plus: 'M12 5v14M5 12h14',
  check: 'm5 12 4 4L19 6',
  clock: 'M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  flame: 'M12 3c1 5 7 6 7 12a7 7 0 0 1-14 0c0-4 3-6 4-8 0 4 2 5 2 5s3-3 1-9Z',
  target: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0m-5 0a5 5 0 1 1-10 0 5 5 0 0 1 10 0m-5 0h.01',
  search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  close: 'm6 6 12 12M6 18 18 6',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4 4l2 2m12 12 2 2M2 12h3m14 0h3M4 20l2-2M18 6l2-2M12 2v3m0 14v3',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  upload: 'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',
  leaf: 'M20 3C8 1 2 8 5 15s15 5 15-12ZM4 21 15 10',
  play: 'm8 4 13 8-13 8Z',
  edit: 'm14 5 5 5M4 20l4-1L21 6a2 2 0 0 0-4-4L4 15Zm0 0 4-1',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  info: 'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  medal: 'm8 14-2 8 6-3 6 3-2-8M19 8A7 7 0 1 1 5 8a7 7 0 0 1 14 0',
  menu: 'M4 6h16M4 12h16M4 18h16',
  user: 'M20 21a8 8 0 0 0-16 0M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  share: 'M12 15V3m-4 4 4-4 4 4M6 10H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-1',
};
@Component({
  selector: 'app-icon', standalone: true,
  template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="path"/></svg>',
  styles: [':host{display:inline-flex;width:20px;height:20px;flex-shrink:0;align-items:center;justify-content:center}svg{width:100%;height:100%}']
})
export class IconComponent {
  @Input() name = 'home';
  get path() { return paths[this.name] ?? paths['home']; }
}

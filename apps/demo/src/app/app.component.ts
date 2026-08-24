import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';

@Component({
  selector: 'demo-root',
  templateUrl: './app.component.html',
  imports: [
    MatTableModule,
    MatCheckboxModule,
    MatIconModule,
    MatListModule,
    RouterLink,
    RouterOutlet,
    MatToolbarModule,
    MatSidenavModule,
    MatButtonModule,
  ],
  styles: `
    .container {
      display: inline;
    }
    .content {
      margin: 4em;
    }
  `,
})
export class AppComponent {
  opened = toSignal(
    inject(BreakpointObserver)
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(
        map(
          ({ breakpoints }) =>
            !(
              breakpoints[Breakpoints.XSmall] || breakpoints[Breakpoints.Small]
            ),
        ),
      ),
    { requireSync: true },
  );
}

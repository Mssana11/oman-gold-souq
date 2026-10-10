import { Component } from '@angular/core';
import { Header } from './components/header/header';
import { Dashboard } from './pages/dashboard/dashboard';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Header, Dashboard],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}

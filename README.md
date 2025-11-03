<!-- PROJECT LOGO -->
<a id="readme-top"></a>
<div align="center">
  <a href="#">
    <img src="./front/public/vite.svg" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Racket app</h3>

  <p align="center">
    A web application to organize, manage, and rank players in round-robin format squash events.
    <br />
    <a href="https://github.com/yellowSpray/racket">View Demo</a>
  </p>
</div>

<!-- ABOUT THE PROJECT -->
## About The Project

Racket App is an application dedicated to squash tournament organizers (or similar sports) who wish to automate the management of registrations, matches, results, and player rankings.

Initially designed for personal use, it aims to offer a simple, secure, and scalable solution with three access levels:
* Player: Registers, unregisters, views their matches and ranking.
* Admin: Validates registrations, organizes matches, enters results, sends notifications.
* Super Admin: Manages admins and global settings.

The application automatically generates a match schedule based on:

* The number of available courts.
* The event's start time.
* The round-robin format.

After each tournament, a dynamic ranking system assigns points, allowing the best players to move up a level and the last ones to move down—thus creating an evolving league.

### Built With

* [![React Badge][React.js]][React-url]
* [![Vite Badge][Vite]][Vite-url]
* [![TypeScript Badge][TypeScript]][TypeScript-url]
* [![Tailwind CSS Badge][TailwindCSS]][Tailwind-url]
* [![React Router Badge][ReactRouter]][ReactRouter-url]
* [![shadcn/ui Badge][shadcn/ui]][shadcn/ui-url]


<!-- USAGE EXAMPLES -->
## Main features
Key Features (Completed/Planned - originally indicated by ✅ or ❌)

* ✅ Secure interface with roles (user / admin / super admin)
* ❌ Player registration / unregistration for an event
* ❌ Manual validation of registrations by an admin
* ❌ Automatic generation of round-robin matches with slot management
* ❌ Result entry and real-time ranking calculation
* ❌ Promotion / relegation between levels (tables/groups) after each event
* ❌ Sending notifications (emails) to players


<!-- ROADMAP -->
## Roadmap

- [x] Base project structure (React + TypeScript + shadcn/ui)
- [x] Authentication and role management
- [ ] Manual registration for new players 
- [ ] Settings for events 
- [ ] Round-robin scheduler generator
- [ ] Ranking and promotion/relegation system
- [ ] Integration of an email service (e.g., Resend)
- [ ] Unit and E2E tests
- [ ] Technical documentation

See the [open issues](https://github.com/yellowSpray/racket/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[Vite]: https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white
[Vite-url]: https://vitejs.dev/
[TypeScript]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[TailwindCSS]: https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white
[Tailwind-url]: https://tailwindcss.com/
[ReactRouter]: https://img.shields.io/badge/React_Router-F44250?style=for-the-badge&logo=react-router&logoColor=white
[ReactRouter-url]: https://reactrouter.com/en/main
[shadcn/ui]: https://img.shields.io/badge/shadcn/ui-000000?style=for-the-badge&logoColor=white
[shadcn/ui-url]: https://ui.shadcn.com/

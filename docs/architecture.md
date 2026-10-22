# SkillSwap

SkillSwap is a platform where users exchange knowledge and skills for free.

## Overview

The core idea is to help users find skills they want to learn and teach skills they know to others.

The match engine uses the principle **"What I want, what they want."**
The match engine uses a state machine to match users for skill exchanges.

## User flow

### Auth & On Boarding 

```mermaid
graph TD
    User([User]) --> Auth[Auth Screen]

    subgraph "1. Authentication Flow"
        Auth --> IsNew{New User?}
        IsNew -- No (Login) --> Dash[Dashboard]
        IsNew -- Yes (Sign Up) --> Create[Create Account]
    end

    subgraph "2. Onboarding Flow"
        Create --> Onboard[Choose Skills to<br>Learn / Teach <br> or <br> Skip]
        Onboard --> Dash
    end
```
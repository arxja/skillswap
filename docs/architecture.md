# SkillSwap

skillswap is a platform that let's exchange knowledge and skills together for free

## Overview

The core idea is make a platform which a user can look for an skill that they want to learn and teach skills that they know to others

This happens by an match engine that is based on this sentence **What i want, What they want**
the engine is has an state machine for its heart and the whole system has to do one thing: **Match the perfect user** for skill/knowledge exchange

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
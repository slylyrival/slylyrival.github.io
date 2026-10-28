# How I won $80 through dozens of hours of python and some stolen elos"

AI disclaimer test

## Introduction

## The simulator
The basic procedure I felt was pretty simple.

1. Define the teams, their elos, and the groups.
2. Simulate the group stage.
3. Set the knockout stage structure with the group stage results.
4. Simulate the knockout stage.
5. Repeat steps 2-4 many thousands of times.
6. Calculate scores for each of the entries to find the highest expected value entry.
7. Profit!

### teams.py
I was going to write out what the purpose of this module is, but hey - I wrote comments! I'll just let that explain it.

```python
"""Define World Cup teams and construct team instances from rating data.

The class Team contains attributes for a 2026 WC team. The function make_team makes a
Team instance from the TEAM_DATA dictionary.

Typical usage:
    custom_team = Team("Country", 1500)
    mexico = make_team("Mexico")

"""
```

First things first, the Teams class:

```python
@dataclass
class Team:
    """A football team at the 2026 World Cup.

    Attributes:
        name: the country name of the team
        elo: the elo rating of the team
        gf: the goals scored by the team
        ga: the goals scored against the team
        pts: points scored in the group stage
        group:  the letter of the group the team belongs to in the group stage
    """

    name: str
    elo: int
    gf: int = 0
    ga: int = 0
    pts: int = 0
    group: str = ""

    @property
    def gd(self) -> int:
        """The goal differential for the Team."""
        return self.gf - self.ga
```

This class is pretty specific to the context of a tournament with a group stage. For future soccer related coding endeavors, it will be good to modify this to include just the attributes relevant for a generic soccer team (players, managers, elo) and leave the rest for specialized classes for the tournament context.

In the course of working on this project I learned about dataclasses. Prior to adding the `@dataclass` decorator, I had written the class with an `__init__()` function that assigned each of the arguments to one of the attributes. Using a dataclass handles that automatically, simplifying the code.

I also learned about the `@property` decorator. I didn't want to create an attribute for Goal Differential that would have to be updated after every game along with the Goals For and Goals Against. The `@property` decorator handles that beautifully, making it so that accessing `argentina.gd` computes the goal differential from the `gf` and `ga` attributes directly.

The `TEAM_DATA` dictionary:

```python
# This TEAM_DATA dictionary contains names and elo for all the 2026 WC teams.
TEAM_DATA = {
    # Group A
    "Mexico": ("Mexico", 1849),
    "South Africa": ("South Africa", 1674),
    "South Korea": ("South Korea", 1758),
    "Czechia": ("Czechia", 1770),
# etc,etc,etc...
```

This did and does look clunky to me. Why am I making each team using the team's name as the value and then setting the `team.name` attribute equal to the name from the key tuple in the dictionary? Surely there's a more elegant way to do this.

### About those elos...
All credit for the elos goes to Nate Silver and Joseph George’s [PELE International Football Rankings](https://www.natesilver.net/p/pele-international-football-rankings-soccer-ratings-projections). I put no amount of thought into which teams were better, only how to forecast which tournament entry had the highest expected value given these ratings. I make no apologies. 

### groups.py

This module defines the World Cup groups and provides a functions for initializing all of the groups: initializing new Group objects populated with four new teams with all attributes (points, GF, GA) set to 0.

The Groups class:

```python
@dataclass
class Group:
    """A World Cup group.

    Attributes:
        name: the name of the group (e.g., 'Group A')
        teams: a list of the four teams in the group
    """

    name: str
    teams: list[Team]

    def sort_group(self) -> None:
        """Sort the group's team list according to points and tie-breaking criteria."""

        # Tie breaking criteria are GD, GF, GA, and coin toss in that order.
        # These are not the actual tie-breaking criteria for the 2026 WC, but they
        # should be acceptable for this simulation level. Actual tie-breaking criteria
        # involve fair play, which is not accounted for in this model.

        self.teams = sorted(
            self.teams,
            key=lambda team: (team.pts, team.gd, team.gf, -team.ga, random.random()),
            reverse=True,
        )


def initialize_groups() -> list[Group]:
    """Return the 2026 World Cup Groups with initialized teams."""

    groups = [
        Group(
            "Group A",
            [
                make_team("Mexico"),
                make_team("South Africa"),
                make_team("South Korea"),
                make_team("Czechia"),
            ],
        ),
# ...etc...
```

Re: `sort_group()`: A more robust simulator would actually implement the real tie-breaking criteria, but I did not have the time or energy to figure that out and it seemed only marginally important.

## simulation.py
This module contains classes and functions for generating and storing the results of a world cup simulation, from simulating a single game to simulating the entire tournament.

### Simulating a match
The function I implemented to simulate a match between two teams is only dependent on the Elos of the two teams. I did not implement any Elo updates for home advantage, form, player injuries, offensive/defensive strength, etc. This is a very naive form of simulation that can be improved on in later updates.

Given the Elos of the two teams, $E_1$ and $E_2$, the probability of the number of goals scored by each team is calculated using a Poisson distribution. There are two constants defined for this calculation: $\mu = 1.35$, the baseline number of goals scored per team given equal elo, and $K = 0.5$, the sensity to elo difference. Larger values of K means that the better team is more dominant. $\mu$ and $K$ are constant across teams and matchups. 

$$
\Delta = \frac{E_1 - E_2}{400}\\
\lambda_1 = \mu e^{K \Delta}, \lambda_2 = \mu e^{-K \Delta}\\
P(\text{k goals scored}) = \frac{e^{-\lambda_n}\lambda_n^k}{k!}
$$

I then calculate a cumulative density function (CDF) for the number of goals scored by each team. I calculate the CDF up to 6 goals scored and then normalize it so that the CDF reaches 100%.

{% include poisson-chart.html %}

## The results

## Final thoughts

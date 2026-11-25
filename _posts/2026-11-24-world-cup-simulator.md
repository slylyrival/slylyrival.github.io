# How I won $80 through dozens of hours of python and some stolen elos"

_AI disclaimer: I used ChatGPT to tutor me through writing the code for the simulator discussed in this post as well as straight up write one specific part of it (this is described in the post). I used ChatGPT to work on some of the web design elements in this post. I used ChatGPT to create the example scoring dictionary block. All the planning, outlining, and writing in the post is mine (a human)._ 

## Introduction
This is a post documenting some of what I learned in the process of writing a 2026 world cup simulation in order to figure out what I should use as my entry to a pool. 

[Here is the Github repo.](https://github.com/slylyrival/world-cup-simulator/tree/main)

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

The chart below shows the probability that each team will score a given number of goals given those three parameters of $\mu$, K, and $\Delta$. You can vary the parameters to get a sense for how those probabilities vary with those parameters.

{% include poisson-chart.html %}

I then calculate a cumulative density function (CDF) for the number of goals scored by each team. I calculate the CDF up to 6 goals scored and then normalize it so that the CDF reaches 100%. I generate a random number between 0 and 1 for each team and use that to determine the goals scored by that team in that match. For group stage matches, if both teams score the same number of goals then the match is scored a draw; for knockout stage matches, I just do a 50/50 coin flip to determine the winner. There is no attempt to simulate penalties - more room for future improvement.

I also did not implement an update to the Elo ratings based on the results of each match. I think this would be wise to do: in a simulated tournament where an underdog successively wins against stronger opponents, their Elo should be updated to better inform predictions of how their future matches will go.

### Simulating the tournament
Once the match simulation itself was set up, I then moved on to simulating the group stage and the knockout stages. The group stage is simple enough: create the six pairings of teams that will play each other, simulate each match, and add the results (PTS, GF, GA) to the teams.

Once the group stage is complete, we sort the teams into the bracket for the knockout stage. The 2026 World Cup expanded the tournament from 32 to 48 teams, introducing this annoying concept where the combination of eight third place teams that are ranked highest determines which team plays which other team during the knockout stage.

![The 'Combinations of matches in the round of 32' table from the 2026 Fifa World Cup knockout stage wikipedia articles]({{'/assets/third-place-teams-table-wikipedia.png' | relative_url }})

I was worried that this table was going to be quite tedious to implement. But I actually got it figured out in like 10 minutes tops! First, I just copied the table from Wikipedia into a text file. Some of the whitespaces are a little wonky from this copy-paste maneuver so I cleaned those up (though, I don't think it would actually matter).


![Text file of the third place table from Wikipedia]({{'/assets/third-place-table.png' | relative_url }})

Then, in the `simulation.py` file, the following code is run at the module level so that the `THIRD_PLACE_DICT` dictionary it creates is available whenever the module is imported.

```python
THIRD_PLACE_TABLE_PATH = Path(__file__).with_name("third_place_table.txt")

THIRD_PLACE_DICT: dict[frozenset[str], list[str]] = {}
with THIRD_PLACE_TABLE_PATH.open(encoding="utf-8") as f:
    for line in f:
        x = line.split()
        advancing_groups = frozenset(x[1:9])
        ordered_matchups = [g[-1] for g in x[9:17]]
        THIRD_PLACE_DICT[advancing_groups] = ordered_matchups
```

This code reads the file, takes the letter characters and creates:
1. A `frozenset` of the letters identifying the groups with the top eight third place teams
2. An list of the group's whose third place team will play the first place teams of groups A, B, D, E, G, I, K, and L in that order.

A frozenset is used to make the set immutable so that it can be used as the key to the dictionary. This makes it so when I sort the third place teams and take the top eight, I can just get their groups and use that set as the key to find the arrangement for the knockout stage.

With the knockout bracket set up, simulating the rest of the tournament is straightforward. Simulate each match in each round, pass the winner on to the next round, repeat until the final is simulated. Each knockout round there is a list of all the teams in the round, sorted so that `team[i]` plays `team[i+1]` for i=[0,2n], where n is the number of teams divided by 2.

```python
for n in range(len(teams) // 2):
    matchup = [teams[2 * n], teams[2 * n + 1]]
    score = simulate_match(matchup)
    winners.append(matchup[get_knockout_winner(score)])
```
### Finding the best entry
Now came the hard-ish part. Originally, the plan was to find the best entry for the pool by simulating the tournament a very large number of times, say 100,000, pull 5-10k of those results aside as the "world" simulations, i.e., simulations which represent real-world tournament results that the other entries will be scored against, and leave the rest as "entry" tournaments. Score each entry tournament against all of the world simulations and find each entry's expected value by averaging the scores. Whichever entry has the highest expected value would be my entry for the pool.

This is a good way to do it, but due to some bad coding on my part, it was initially taking about an hour to score everything. Simulating 100k tournaments would only take ~40 seconds, but then an hour to score and find which one was best. And initally I was getting an EV of around 30 points for the best entry, which seemed low. 

My initial approach to scoring the simulations was very stupid. It was just scoring every entry against every world and taking the average of the scores. So for 90k entries scored against 10k worlds, that's doing the scoring calculation 90 million times. I had hit crunch time for getting the final result so I turned to ChatGPT and told it to just re-write the scoring process for me, which it of course did instantly and dropped the time of the scoring phase from an hour to under a second.

ChatGPT's brilliant idea was to go through all of the world simulations and create a dictionary that tallied the number of times a given country's team was in a particular position in the tournament. The dictionary would look something like this:

```python
{
    "n": 100000, # number of simulations

    # count of group finishing positions
    # the first counter is how many times each team finished 1st,
    # second counter is how many times each team finished 2nd, etc.
    "group_pos": [
        [  # Group A
            Counter({  # First place
                "Mexico": 60000,
                "South Korea": 25000,
                "Czech Republic": 10000,
                "South Africa": 5000
            }),
            Counter({  # Second place
                "Mexico": 25000,
                "South Korea": 45000,
                "Czech Republic": 20000,
                "South Africa": 10000
            }),
            Counter({  # Third place
                "Mexico": 10000,
                "South Korea": 20000,
                "Czech Republic": 45000,
                "South Africa": 25000
            }),
            Counter({  # Fourth place
                "Mexico": 5000,
                "South Korea": 10000,
                "Czech Republic": 25000,
                "South Africa": 60000
            })
        ],
        # Groups B through L ...
    ],


    # counters for each exact group order
    "group_exact": [
        Counter({  # Group A
            ("Mexico", "South Korea", "Czech Republic", "South Africa"): 25000,
            ("South Korea", "Mexico", "Czech Republic", "South Africa"): 12000,
            ("Mexico", "Czech Republic", "South Korea", "South Africa"): 10000,
            # Remaining permutations ...
        }),
        # Groups B through L ...
    ],

    # remaining counters below count how many times a specific team won a
    # specific match in each round
    
    "ro32": [
        Counter({  # Match 73
            "Mexico": 42000,
            "South Korea": 28000,
            "Canada": 20000,
            "Switzerland": 10000
        }),
        Counter({  # Match 74
            "Germany": 65000,
            "Japan": 20000,
            "Ecuador": 15000
        }),
        # Matches 75 through 88 ...
    ],

    "ro16": [
        Counter({  # Match 89
            "Spain": 45000,
            "Germany": 30000,
            "Japan": 10000,
            # Other possible winners ...
        }),
        # Matches 90 through 96 ...
    ],

    "qf": [
        Counter({  # Match 97
            "Spain": 35000,
            "Germany": 25000,
            "Brazil": 15000,
            # Other possible winners ...
        }),
        # Matches 98 through 100 ...
    ],

    "sf": [
        Counter({  # Match 101
            "Spain": 28000,
            "Germany": 18000,
            "Brazil": 16000,
            # Other possible winners ...
        }),
        Counter({  # Match 102
            "Argentina": 32000,
            "France": 26000,
            "England": 18000,
            # Other possible winners ...
        })
    ],

    "third": Counter({  # Match 103
        "Spain": 10500,
        "Argentina": 9200,
        "France": 8700,
        # Other possible winners ...
    }),

    "champ": Counter({  # Match 104
        "Spain": 18500,
        "Argentina": 16200,
        "France": 14800,
        # Other possible winners ...
    })
}
```

So process all the worlds one time to construct that dictionary, then check the results of each potential entry once against that dictionary. Wow!

## The results
Here is the final winning candidate:


### Group Stage Predictions

Teams marked with an asterisk (*) advance as one of the eight
best third-place finishers.

| Group | 1st | 2nd | 3rd | 4th |
|:---:|---|---|---|---|
| A | Mexico | Czechia | South Korea* | South Africa |
| B | Switzerland | Canada | Bosnia and Herzegovina* | Qatar |
| C | Brazil | Morocco | Scotland* | Haiti |
| D | Turkey | Paraguay | United States | Australia |
| E | Germany | Ecuador | Ivory Coast | Curacao |
| F | Netherlands | Japan | Sweden* | Tunisia |
| G | Belgium | Egypt | Iran* | New Zealand |
| H | Spain | Uruguay | Cape Verde* | Saudi Arabia |
| I | France | Norway | Senegal | Iraq |
| J | Argentina | Austria | Algeria* | Jordan |
| K | Portugal | Colombia | DR Congo | Uzbekistan |
| L | England | Croatia | Panama* | Ghana |

### Knockout Stage Predictions

![Predicted World Cup knockout bracket]({{ '/assets/images/world-cup-bracket.svg' | relative_url }})

## Final thoughts
I won. That was cool. Probably a good bit of luck involved there. Some interesting analysis that I could try to do sometime when I'm not trying to finally get this effing blog post onto the internet is run the simulation a bunch of (a thousand or so?) times and see how often the winning entries would actually have beaten the rest of the actual entries in the pool. The fact that I actually barely won in this one instance of the universe ultimately doesn't mean much.

I enjoyed the process of puzzle-solving involved in getting this simulator together. I thank ChatGPT heartily for its steadfast tutoring and also coming in clutch with that scoring mechanism. Bittersweet that ChatGPT ultimately enabled me to push past my mediocre coding knowledge and actually get a project like this done, but ChatGPT also makes that part meaningless. And I stole the actually secret sauce from Nate Silver. 


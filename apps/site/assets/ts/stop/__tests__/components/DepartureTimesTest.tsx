import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import DepartureTimes, {
  getNextTwoTimes,
  infoToDisplayTime
} from "../../components/DepartureTimes";
import { baseRoute } from "../helpers";
import { Alert, Stop } from "../../../__v3api";
import { DepartureInfo } from "../../../models/departureInfo";
import * as predictionsChannel from "../../../hooks/usePredictionsChannel";
import { ScheduleWithTimestamp } from "../../../models/schedules";
import { PredictionWithTimestamp } from "../../../models/perdictions";

const route = baseRoute("TestRoute", 1);
const stop = {} as Stop;
const destinationText = route.direction_destinations[0]!;
const mockClickAction = jest.fn();

describe("DepartureTimes", () => {
  it("should display a default", () => {
    render(
      <DepartureTimes
        route={route}
        stop={stop}
        directionId={0}
        schedulesForDirection={[]}
        onClick={mockClickAction}
        alertsForDirection={[]}
      />
    );
    expect(screen.findByText(destinationText)).toBeDefined();
    expect(
      screen.queryByRole("button", {
        name: `Open upcoming departures to ${destinationText}`
      })
    ).toBeDefined();
  });

  it("should render rows if there are schedules", () => {
    const dateToCompare = new Date("2022-04-27T10:30:00-04:00");
    jest.spyOn(predictionsChannel, "default").mockImplementation(() => {
      return {
        "Test 1": [
          {
            time: new Date("2022-04-27T11:15:00-04:00"),
            trip: { id: "1", headsign: "Test 1" }
          },
          {
            trip: { id: "2", headsign: "Test 1" },
            time: new Date("2022-04-27T11:20:00-04:00")
          }
        ] as PredictionWithTimestamp[],
        "Test 3": [
          {
            trip: { id: "3", headsign: "Test 3" },
            time: new Date("2022-04-27T11:45:00-04:00")
          }
        ] as PredictionWithTimestamp[]
      };
    });
    const schedules = [
      {
        trip: { id: "1", headsign: "Test 1" },
        time: new Date("2022-04-27T11:15:00-04:00")
      },
      {
        trip: { id: "2", headsign: "Test 1" },
        time: new Date("2022-04-27T11:18:00-04:00")
      },
      {
        trip: { id: "4", headsign: "Test 2" },
        time: new Date("2022-04-27T11:40:00-04:00")
      }
    ] as ScheduleWithTimestamp[];
    render(
      <DepartureTimes
        route={route}
        stop={stop}
        directionId={0}
        schedulesForDirection={schedules}
        overrideDate={dateToCompare}
        onClick={mockClickAction}
        alertsForDirection={[]}
      />
    );
    expect(screen.getByText("Test 1"));
    expect(screen.getByText("Test 2"));
    expect(screen.getByText("45 min"));
    expect(screen.getByText("50 min"));
    expect(screen.getByText("11:40 AM"));
    // We don't support predictions without schedules yet
    // expect(screen.getByText("Test 3"))
    // expect(screen.getByText("11:45 AM"))
  });

  it.each`
    alertEffect     | expectedBadge
    ${"suspension"} | ${"Stop Closed"}
    ${"shuttle"}    | ${"Shuttle Service"}
    ${"detour"}     | ${"Detour"}
  `(
    `displays $expectedBadge when alert has effect $alertEffect`,
    ({ alertEffect, expectedBadge }) => {
      const schedules = [
        { trip: { direction_id: 0 } }
      ] as ScheduleWithTimestamp[];

      const alerts = [
        {
          id: "1234",
          informed_entity: {
            direction_id: [0]
          },
          effect: alertEffect
        }
      ] as Alert[];

      render(
        <DepartureTimes
          route={route}
          stop={stop}
          directionId={0}
          schedulesForDirection={schedules}
          alertsForDirection={alerts}
          onClick={() => {}}
        />
      );
      expect(screen.getByText(expectedBadge)).toBeDefined();
    }
  );

  describe("getNextTwoTimes", () => {
    it("should return the next 2 departure infos times", () => {
      const departureInfos = [
        {
          prediction: { time: new Date("2022-04-26T11:15:00-04:00") }
        },
        {
          prediction: { time: new Date("2022-04-26T11:25:00-04:00") }
        },
        {
          prediction: { time: new Date("2022-04-27T01:03:00-04:00") }
        }
      ] as DepartureInfo[];

      const [time1, time2] = getNextTwoTimes(departureInfos);
      expect(time1?.prediction?.time).toEqual(
        new Date("2022-04-26T11:15:00-04:00")
      );
      expect(time2?.prediction?.time).toEqual(
        new Date("2022-04-26T11:25:00-04:00")
      );
    });
    it("should return the next departure info that is not cancelled", () => {
      const departureInfos = [
        {
          prediction: { time: new Date("2022-04-26T11:15:00-04:00") }
        },
        {
          prediction: {
            time: new Date("2022-04-26T11:25:00-04:00"),
            schedule_relationship: "cancelled"
          },
          isCancelled: true
        },
        {
          prediction: { time: new Date("2022-04-27T01:03:00-04:00") }
        }
      ] as DepartureInfo[];

      const [time1, time2] = getNextTwoTimes(departureInfos);
      expect(time1?.prediction?.time).toEqual(
        new Date("2022-04-26T11:15:00-04:00")
      );
      expect(time2?.prediction?.time).toEqual(
        new Date("2022-04-27T01:03:00-04:00")
      );
    });
    it("should return an array of undefineds if no departure info passed to it", () => {
      const [time1, time2] = getNextTwoTimes([]);
      expect(time1).toBeUndefined();
      expect(time2).toBeUndefined();
    });
    it("should return the first departure info even if it is cancelled", () => {
      const departureInfos = [
        {
          prediction: {
            time: new Date("2022-04-26T11:15:00-04:00"),
            schedule_relationship: "cancelled"
          }
        },
        {
          prediction: { time: new Date("2022-04-26T11:25:00-04:00") }
        }
      ] as DepartureInfo[];
      const [time1, time2] = getNextTwoTimes(departureInfos);
      expect(time1?.prediction?.time).toEqual(
        new Date("2022-04-26T11:15:00-04:00")
      );
      expect(time2?.prediction?.time).toEqual(
        new Date("2022-04-26T11:25:00-04:00")
      );
    });

    it("should return one departure time and undefined if only one departure info", () => {
      const departureInfos = [
        {
          prediction: { time: new Date("2022-04-26T11:15:00-04:00") }
        }
      ] as DepartureInfo[];
      const [time1, time2] = getNextTwoTimes(departureInfos);
      expect(time1?.prediction?.time).toEqual(
        new Date("2022-04-26T11:15:00-04:00")
      );
      expect(time2).toBeUndefined();
    });
    it("should return one departure and an undefined if all remaining are cancelled", () => {
      const departureInfos = [
        {
          prediction: { time: new Date("2022-04-26T11:15:00-04:00") }
        },
        {
          prediction: {
            time: new Date("2022-04-26T11:25:00-04:00"),
            schedule_relationship: "cancelled"
          },
          isCancelled: true
        },
        {
          prediction: {
            time: new Date("2022-04-26T11:35:00-04:00"),
            schedule_relationship: "cancelled"
          },
          isCancelled: true
        }
      ] as DepartureInfo[];
      const [time1, time2] = getNextTwoTimes(departureInfos);
      expect(time1?.prediction?.time).toEqual(
        new Date("2022-04-26T11:15:00-04:00")
      );
      expect(time2).toBeUndefined();
    });
  });

  describe("infoToDisplayTime", () => {
    it("should return 2 times in number of minutes remaining because both times are less than an hour out", () => {
      const compareTime = new Date("2022-04-24T11:15:00-04:00");
      const info1 = {
        prediction: { time: new Date("2022-04-24T11:35:00-04:00"), trip: {} }
      } as DepartureInfo;
      const info2 = {
        prediction: { time: new Date("2022-04-24T11:45:00-04:00"), trip: {} }
      } as DepartureInfo;
      const [displayTime1, displayTime2] = infoToDisplayTime(
        info1,
        info2,
        compareTime
      );

      expect(displayTime1.displayString).toEqual("20 min");
      expect(displayTime1.isBolded).toBe(true);
      expect(displayTime1.isPrediction).toBe(true);
      expect(displayTime2.displayString).toEqual("30 min");
    });

    it("should return one time in number of minutes remaining because 2nd info time is greater than an hour", () => {
      const compareTime = new Date("2022-04-24T11:15:00-04:00");
      const info1 = {
        prediction: { time: new Date("2022-04-24T11:35:00-04:00"), trip: {} }
      } as DepartureInfo;
      const info2 = {
        prediction: { time: new Date("2022-04-24T12:45:00-04:00"), trip: {} }
      } as DepartureInfo;
      const [displayTime1, displayTime2] = infoToDisplayTime(
        info1,
        info2,
        compareTime
      );

      expect(displayTime2).toBeUndefined();
      expect(displayTime1.displayString).toEqual("20 min");
      expect(displayTime1.isBolded).toBe(true);
      expect(displayTime1.isPrediction).toBe(true);
    });

    it("should return one time in hh:mm aa format because the next time is over an hour away", () => {
      const compareTime = new Date("2022-04-24T11:15:00-04:00");
      const info1 = {
        prediction: {
          time: new Date("2022-04-24T12:35:00-04:00"),
          track: "Test Track",
          trip: {}
        }
      } as DepartureInfo;
      const info2 = {
        prediction: { time: new Date("2022-04-24T12:45:00-04:00"), trip: {} }
      } as DepartureInfo;
      const [displayTime1] = infoToDisplayTime(info1, info2, compareTime);

      expect(displayTime1.displayString).toEqual("12:35 PM");
      expect(displayTime1.isBolded).toBe(true);
      expect(displayTime1.isPrediction).toBe(true);
      expect(displayTime1.trackName).toEqual("Test Track");
    });

    it("should return the display time as tomorrow", () => {
      const compareTime = new Date("2022-04-24T11:15:00-04:00");
      const info1 = {
        prediction: { time: new Date("2022-04-25T02:01:00-04:00"), trip: {} }
      } as DepartureInfo;
      const [tomorrowTime1, tomorrowTime2] = infoToDisplayTime(
        info1,
        undefined,
        compareTime
      );
      expect(tomorrowTime1.displayString).toEqual("2:01 AM");
      expect(tomorrowTime1.isTomorrow).toBe(true);
      expect(tomorrowTime2).toBeUndefined();
    });

    it("should display arriving if the next time is less than a minute away", () => {
      const compareTime = new Date("2022-04-24T11:15:00-04:00");
      const info1 = {
        prediction: { time: new Date("2022-04-24T11:14:45-04:00"), trip: {} }
      } as DepartureInfo;
      const [tomorrowTime1, tomorrowTime2] = infoToDisplayTime(
        info1,
        undefined,
        compareTime
      );
      expect(tomorrowTime1.displayString).toEqual("Arriving");
      expect(tomorrowTime1.isPrediction).toBe(true);
      expect(tomorrowTime2).toBeUndefined();
    });

    it("should return `no upcoming trips` if next trip is greater than 24 hours away", () => {
      const compareTime = new Date("2022-04-24T11:15:00-04:00");
      const info1 = {
        prediction: { time: new Date("2022-04-26T11:16:00-04:00") }
      } as DepartureInfo;
      const [time1, time2] = infoToDisplayTime(info1, undefined, compareTime);
      expect(time1.displayString).toEqual("No upcoming trips");
      expect(time2).toBeUndefined();
    });

    it("should return `updates unavailable` if no data is present", () => {
      const compareTime = new Date("2022-04-24T11:15:00-04:00");
      const [time1, time2] = infoToDisplayTime(
        undefined,
        undefined,
        compareTime
      );
      expect(time1.displayString).toEqual("Updates unavailable");
      expect(time2).toBeUndefined();
    });

    it("should strike out the time for delayed info", () => {
      const compareTime = new Date("2022-04-24T11:15:00-04:00");
      const info1 = {
        prediction: {
          time: new Date("2022-04-24T11:35:00-04:00"),
          trip: {}
        },
        schedule: {
          time: new Date("2022-04-24T11:33:00-04:00"),
          trip: {}
        },
        isDelayed: true
      } as DepartureInfo;
      const info2 = {
        prediction: { time: new Date("2022-04-24T11:45:00-04:00") }
      } as DepartureInfo;
      const [displayTime1, displayTime2] = infoToDisplayTime(
        info1,
        info2,
        compareTime
      );

      expect(displayTime1.displayString).toEqual("11:35 AM");
      expect(displayTime1.isBolded).toBe(true);
      expect(displayTime1.isPrediction).toBe(true);
      expect(displayTime2.displayString).toEqual("11:33 AM");
    });
    it("should strike out the time for cancelled info", () => {
      const compareTime = new Date("2022-04-24T11:15:00-04:00");
      const info1 = {
        prediction: {
          time: new Date("2022-04-24T11:35:00-04:00"),
          schedule_relationship: "cancelled",
          trip: {}
        },
        schedule: {
          time: new Date("2022-04-24T11:33:00-04:00"),
          trip: {}
        },
        isCancelled: true
      } as DepartureInfo;
      const info2 = {
        prediction: {
          time: new Date("2022-04-24T11:45:00-04:00"),
          track: "Test Track",
          trip: {}
        }
      } as DepartureInfo;

      const [displayTime1, displayTime2] = infoToDisplayTime(
        info1,
        info2,
        compareTime
      );

      expect(displayTime2.isStikethrough).toBe(true);
      expect(displayTime2.displayString).toEqual("11:35 AM");
      expect(displayTime2.trackName).toEqual("Test Track");
      expect(displayTime1.displayString).toEqual("11:45 AM");
      expect(displayTime1.isBolded).toEqual(true);
      expect(displayTime1.isPrediction).toBe(true);
    });

    it("should not set the isPrediction if first info is from schedule", () => {
      const compareTime = new Date("2022-04-24T11:15:00-04:00");
      const info1 = {
        schedule: { time: new Date("2022-04-24T11:35:00-04:00"), trip: {} }
      } as DepartureInfo;
      const info2 = {
        prediction: { time: new Date("2022-04-24T11:45:00-04:00"), trip: {} }
      } as DepartureInfo;
      const [displayTime1, displayTime2] = infoToDisplayTime(
        info1,
        info2,
        compareTime
      );

      expect(displayTime1.displayString).toEqual("20 min");
      expect(displayTime1.isBolded).toBe(true);
      expect(displayTime1.isPrediction).toBe(false);
      expect(displayTime2.displayString).toEqual("30 min");
    });
  });

  it("should display a default", () => {
    const stop = {
      id: "test-stop",
      name: "Test Stop",
      latitude: 42.3519,
      longitude: 71.0552
    } as Stop;

    const schedules = [
      {
        trip: { id: "1" },
        time: new Date("2022-04-27T11:15:00-04:00")
      },
      {
        trip: { id: "2" },
        time: new Date("2022-04-27T11:18:00-04:00")
      },
      {
        trip: { id: "4" },
        time: new Date("2022-04-27T11:40:00-04:00")
      }
    ] as ScheduleWithTimestamp[];

    let departureTimes = render(
      <DepartureTimes
        route={route}
        stop={stop}
        directionId={0}
        schedulesForDirection={schedules}
        onClick={mockClickAction}
        alertsForDirection={[]}
      />
    );

    expect(
      departureTimes.container.querySelector(".departure-row-click-test")
    ).toBeDefined();
    fireEvent.click(
      departureTimes.baseElement.querySelector(".departure-row-click-test")!
    );
    expect(mockClickAction).toHaveBeenCalledTimes(1);
  });
});
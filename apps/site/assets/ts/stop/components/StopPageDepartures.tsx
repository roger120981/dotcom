import { filter, groupBy, sortBy } from "lodash";
import { isPast } from "date-fns";
import React, { ReactElement, useState } from "react";
import { Alert, DirectionId, Route, Stop } from "../../__v3api";
import DeparturesFilters, { ModeChoice } from "./DeparturesFilters";
import { modeForRoute } from "../../models/route";
import DepartureCard from "./DepartureCard";
import { ScheduleWithTimestamp } from "../../models/schedules";
import { alertsByRoute } from "../../models/alert";

interface StopPageDeparturesProps {
  routes: Route[];
  stop: Stop;
  schedules: ScheduleWithTimestamp[];
  onClick: (
    route: Route,
    directionId: DirectionId,
    departures: ScheduleWithTimestamp[] | null | undefined
  ) => void;
  alerts: Alert[];
}

// Commuter Rail, then Subway, then Bus
const modeSortFn = ({ type }: Route): number => {
  if (type === 2) {
    return 1;
  }
  if (type in [0, 1]) {
    return 2;
  }
  return type;
};

const StopPageDepartures = ({
  routes,
  stop,
  schedules,
  onClick,
  alerts
}: StopPageDeparturesProps): ReactElement<HTMLElement> => {
  // default to show all modes.
  const [selectedMode, setSelectedMode] = useState<ModeChoice>("all");
  const groupedRoutes = groupBy(routes, modeForRoute);
  // This filtering should be done on the backend
  const currentSchedules = filter(
    schedules,
    (s: ScheduleWithTimestamp) => !isPast(s.time)
  );
  const groupedSchedules = groupBy(currentSchedules, s => s.route.id);
  const modesList = Object.keys(groupedRoutes) as ModeChoice[];
  const filteredRoutes =
    selectedMode === "all" ? routes : groupedRoutes[selectedMode];
  const groupedAlerts = alertsByRoute(alerts);

  return (
    <div className="routes">
      {modesList.length > 1 && (
        <DeparturesFilters
          modesList={modesList}
          selectedMode={selectedMode}
          setSelectedMode={setSelectedMode}
        />
      )}
      <ul className="stop-departures list-unstyled">
        {sortBy(filteredRoutes, [modeSortFn, "sort_order"]).map(route => (
          <DepartureCard
            key={route.id}
            route={route}
            stop={stop}
            schedulesForRoute={groupedSchedules[route.id]}
            onClick={onClick}
            // This list should only have one value, is there another way to do this?
            alertsForRoute={groupedAlerts[route.id]}
          />
        ))}
      </ul>
    </div>
  );
};

export default StopPageDepartures;
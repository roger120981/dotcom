import React from "react";
import { Alert, Facility } from "../../__v3api";
import Alerts from "../../components/Alerts";
import { hasFacilityAlert } from "../../models/alert";
import { AmenityModal, AmenityLink } from "./amenities/AmenityCard";

const AccessAmenitiesModal = ({
  stopName,
  alerts,
  facilities,
  facilityType
}: {
  stopName: string;
  alerts: Alert[];
  facilities: Facility[];
  facilityType: "Elevator" | "Escalator";
}): JSX.Element => {
  const hasFacilities = facilities ? facilities.length > 0 : false;
  const linkText =
    facilityType === "Elevator"
      ? "Report an elevator issue"
      : "Report an escalator issue";
  return (
    <>
      {hasFacilities && (
        <AmenityModal headerText={`${facilityType}s at ${stopName}`}>
          <Alerts alerts={alerts} />
          <table className="access-amenities-table">
            <tbody>
              <tr className="access-amenities-header access-amenities-row">
                <th className="ps-16">{facilityType}</th>
                <th className="status">Status</th>
              </tr>
              {facilities?.map(facility => {
                return (
                  <tr key={facility.id} className="access-amenities-row fs-14">
                    <td className="ps-16 pe-16">
                      {facility.attributes.short_name}
                    </td>
                    {hasFacilityAlert(facility.id, alerts) ? (
                      <td className="status">
                        <i className="fa-solid fa-circle amenity-status amenity-out" />
                        Out of Order
                      </td>
                    ) : (
                      <td className="status">
                        <i className="fa-solid fa-circle amenity-status amenity-working" />
                        Working
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <AmenityLink
            url="/accessibility/trip-planning"
            text="Plan an accessible trip"
          />
          <AmenityLink url="/customer-support" text={linkText} />
        </AmenityModal>
      )}
    </>
  );
};
export default AccessAmenitiesModal;
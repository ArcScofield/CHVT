<%@ WebHandler Language="C#" Class="getData" %>

using System;
using System.Web;

//FIXME:继承getData.ashx和selectData.ashx
public class getData : IHttpHandler
{
    //mdb数据库文件位置
    private const String AccessFileName = "..\\App_data\\TownVillage.mdb";

    public void ProcessRequest(HttpContext httpContext)
    {
        httpContext.Response.ContentType = "text/plain";

        System.Data.DataTable dt = GetDataTable();
        string strjson = DataTableToJson2(dt);
        httpContext.Response.Write(strjson);
    }

    /// <summary>
    /// convert datatable to json string
    /// </summary>
    public static string DataTableToJson2(System.Data.DataTable dt)
    {
        System.Text.StringBuilder json = new System.Text.StringBuilder();
        json.Append("[");
        for (int i = 0; i < dt.Rows.Count; i++)
        {
            json.Append("{");
            for (int j = 0; j < dt.Columns.Count; j++)
            {
                json.Append("\"");
                json.Append(dt.Columns[j].ColumnName);
                json.Append("\":\"");
                json.Append(dt.Rows[i][j].ToString());
                json.Append("\",");
            }
            json.Remove(json.Length - 1, 1);
            json.Append("},");
        }
        json.Remove(json.Length - 1, 1);
        json.Append("]");
        return json.ToString();
    }

    /// <summary>
    /// 
    /// </summary>
    public System.Data.DataTable GetDataTable()
    {
        System.Data.OleDb.OleDbConnection oleConnection;
        System.Data.DataTable dt = new System.Data.DataTable();
        System.Data.OleDb.OleDbDataReader oleDataReader = null;

        string strConnection = String.Format(@"provider=microsoft.jet.oledb.4.0;Data Source={0}",
                                                                      HttpContext.Current.Server.MapPath(AccessFileName));
        oleConnection = new System.Data.OleDb.OleDbConnection(strConnection);

        try
        {
            if (oleConnection.State == System.Data.ConnectionState.Closed || oleConnection.State == System.Data.ConnectionState.Broken)
            {
                oleConnection.Open();
            }

            System.Data.OleDb.OleDbCommand oleCmd = oleConnection.CreateCommand();
            oleCmd.CommandText = @"SELECT ID, sName, fullName, order, province, city,county, town, x, y, rsImage, video, image, summary, doc, officialSite  FROM TownVillage";
            oleDataReader = oleCmd.ExecuteReader();
            dt.Load(oleDataReader);
        }
        catch (System.Exception ex)
        {
            throw new Exception(ex.Message);
        }
        finally
        {
            if (oleDataReader != null)
            {
                oleDataReader.Close();
            }

            if (oleConnection.State == System.Data.ConnectionState.Open)
            {
                oleConnection.Close();
            }
        }
        return dt;
    }

    public bool IsReusable
    {
        get
        {
            return false;
        }
    }
}